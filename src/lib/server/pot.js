import { query } from './db.js';
import { loadLeagueData, loadLeagueRosters } from './dataLoaders.js';
import { previousLeagueKeys } from '$lib/utils/leagueInfo.js';

/**
 * NFL fantasy "season year". A season spanning Sept–Feb is named after the
 * starting calendar year (e.g. Sept 2025–Feb 2026 = the 2025 season).
 */
export function getCurrentSeasonYear(date = new Date()) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        return month <= 2 ? year - 1 : year;
}

function num(value, fallback = 0) {
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
}

export async function getSettings() {
        const { rows } = await query('SELECT buy_in_amount, pot_split_pct FROM pot_settings WHERE id = 1');
        const row = rows[0] || {};
        const buyIn = num(row.buy_in_amount, 150);
        const potSplitPct = num(row.pot_split_pct, 50);
        return {
                buyIn,
                potSplitPct,
                potShare: buyIn * (potSplitPct / 100),
                poolShare: buyIn * ((100 - potSplitPct) / 100)
        };
}

async function getSeasonRecord(year) {
        const { rows } = await query('SELECT * FROM season_records WHERE year = $1', [year]);
        const row = rows[0];
        if (!row) {
                return {
                        year,
                        payoutFirst: 0,
                        payoutSecond: 0,
                        payoutThird: 0,
                        firstPaid: false,
                        secondPaid: false,
                        thirdPaid: false,
                        championTeamKey: null,
                        championName: null,
                        championRecorded: false,
                        championSource: null
                };
        }
        return {
                year: row.year,
                payoutFirst: num(row.payout_first),
                payoutSecond: num(row.payout_second),
                payoutThird: num(row.payout_third),
                firstPaid: row.first_paid,
                secondPaid: row.second_paid,
                thirdPaid: row.third_paid,
                championTeamKey: row.champion_team_key,
                championName: row.champion_name,
                championRecorded: row.champion_recorded,
                championSource: row.champion_source
        };
}

/**
 * Persists an auto-detected champion into season_records. A commissioner-entered
 * champion (champion_source = 'manual') is treated as an override and is never
 * overwritten — the conditional ON CONFLICT clause guarantees that even if this
 * is called for a season the commissioner has already set by hand.
 */
async function recordAutoChampion(year, teamKey, name) {
        if (!Number.isFinite(year) || !name) return;
        await query(
                `INSERT INTO season_records
                         (year, champion_team_key, champion_name, champion_recorded, champion_source, updated_at)
                 VALUES ($1, $2, $3, true, 'auto', now())
                 ON CONFLICT (year) DO UPDATE
                         SET champion_team_key = EXCLUDED.champion_team_key,
                                 champion_name = EXCLUDED.champion_name,
                                 champion_recorded = true,
                                 champion_source = 'auto',
                                 updated_at = now()
                         WHERE season_records.champion_source IS DISTINCT FROM 'manual'`,
                [year, teamKey, name]
        );
}

/**
 * Resolves the champion of a *completed* season directly from Yahoo. Yahoo's
 * final team standings rank reflects the playoff result once the season is over,
 * so the team finishing at rank 1 is the league champion. Returns null when the
 * season is still in progress, the client is unavailable, or it cannot be
 * determined — callers then fall back to the commissioner-recorded champion.
 */
async function getYahooChampion(yahooClient, leagueKey) {
        if (!yahooClient || !leagueKey) return null;
        try {
                const [leagueData, rostersResult] = await Promise.all([
                        loadLeagueData(yahooClient, leagueKey),
                        loadLeagueRosters(yahooClient, leagueKey)
                ]);
                if (!leagueData || leagueData.status !== 'complete') return null;

                const year = parseInt(leagueData.season, 10);
                if (!Number.isFinite(year)) return null;

                const rosters = rostersResult?.rosters ? Object.values(rostersResult.rosters) : [];
                const champ = rosters.find((r) => Number(r?.metadata?.rank) === 1);
                if (!champ) return null;

                const teamKey = champ.metadata?.team_key || null;
                const name = champ.metadata?.team_name || null;
                if (!teamKey && !name) return null;

                return { year, teamKey, name };
        } catch (err) {
                console.error('[pot] Yahoo champion lookup failed:', err.message);
                return null;
        }
}

/**
 * Champion history ordered by year asc. Yahoo's historical league result is
 * preferred when available; commissioner-recorded champions are used as the
 * fallback for any season Yahoo can't resolve.
 */
export async function getChampionHistory(yahooClient = null, leagueKey = null) {
        const { rows } = await query(
                `SELECT year, champion_team_key, champion_name, champion_source FROM season_records
                 WHERE champion_recorded = true AND champion_name IS NOT NULL
                 ORDER BY year ASC`
        );

        const byYear = new Map(
                rows.map((r) => [
                        r.year,
                        {
                                year: r.year,
                                teamKey: r.champion_team_key,
                                name: r.champion_name,
                                source: r.champion_source === 'auto' ? 'yahoo' : 'manual'
                        }
                ])
        );

        if (yahooClient) {
                const keys = [leagueKey, ...(previousLeagueKeys || [])].filter(Boolean);
                const yahooChamps = await Promise.all(keys.map((key) => getYahooChampion(yahooClient, key)));
                for (const champ of yahooChamps) {
                        if (!champ) continue;
                        // Never clobber a commissioner override.
                        const existing = byYear.get(champ.year);
                        if (existing && existing.source === 'manual') continue;
                        // Auto-record the detected champion so back-to-back detection and
                        // future reads run off persisted data, not a live recomputation.
                        await recordAutoChampion(champ.year, champ.teamKey, champ.name);
                        byYear.set(champ.year, { ...champ, source: 'yahoo' });
                }
        }

        return [...byYear.values()].sort((a, b) => a.year - b.year);
}

/**
 * Final podium (1st/2nd/3rd) of the most recent *completed* season, resolved
 * from Yahoo's final standings. Checks the current league key plus any
 * previousLeagueKeys and returns the highest completed season year. Returns
 * null when no completed season can be resolved (e.g. preseason with no history)
 * — callers then render a placeholder.
 */
export async function getLastSeasonPodium(yahooClient = null, leagueKey = null) {
        if (!yahooClient) return null;
        // Seed with the configured keys, then walk Yahoo's season chain via each
        // league's `previous_league_id` (derived from the `renew` field). This means
        // historical seasons resolve automatically — no need to hardcode every
        // past league key in previousLeagueKeys.
        const queue = [leagueKey, ...(previousLeagueKeys || [])].filter(Boolean);
        const seen = new Set();
        let best = null;
        let guard = 0;

        while (queue.length > 0 && guard < 25) {
                guard += 1;
                const key = queue.shift();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                try {
                        const leagueData = await loadLeagueData(yahooClient, key);
                        if (!leagueData) continue;

                        // Follow the chain to the previous season regardless of this
                        // league's completion status (the current season is in progress).
                        if (leagueData.previous_league_id && !seen.has(leagueData.previous_league_id)) {
                                queue.push(leagueData.previous_league_id);
                        }

                        if (leagueData.status !== 'complete') continue;

                        const year = parseInt(leagueData.season, 10);
                        if (!Number.isFinite(year)) continue;
                        if (best && year <= best.year) continue;

                        const rostersResult = await loadLeagueRosters(yahooClient, key);
                        const rosters = rostersResult?.rosters ? Object.values(rostersResult.rosters) : [];
                        const ranked = rosters
                                .filter((r) => Number.isFinite(Number(r?.metadata?.rank)))
                                .sort((a, b) => Number(a.metadata.rank) - Number(b.metadata.rank));
                        if (ranked.length === 0) continue;

                        const podium = ranked.slice(0, 3).map((r, i) => ({
                                place: i + 1,
                                name: r.metadata?.team_name || 'Unknown Team',
                                teamKey: r.metadata?.team_key || null,
                                logo: r.metadata?.team_logo || null,
                                wins: r.settings?.wins ?? null,
                                losses: r.settings?.losses ?? null,
                                pointsFor: num(r.settings?.fpts, null)
                        }));

                        best = { year, podium };
                } catch (err) {
                        console.error('[pot] podium lookup failed for', key, err.message);
                }
        }

        return best;
}

/**
 * Determines the reigning champion (most recent recorded season) and whether a
 * back-to-back is in play or already achieved.
 */
export function computeChampionStatus(history) {
        if (!history || history.length === 0) {
                return { reigning: null, backToBackAchieved: false, priorChampion: null };
        }
        const sorted = [...history].sort((a, b) => b.year - a.year);
        const reigning = sorted[0];
        const prior = sorted.find((c) => c.year === reigning.year - 1) || null;
        const sameAsPrior =
                !!prior &&
                ((reigning.teamKey && prior.teamKey && reigning.teamKey === prior.teamKey) ||
                        (reigning.name && prior.name && reigning.name === prior.name));
        return { reigning, priorChampion: prior, backToBackAchieved: sameAsPrior };
}

/**
 * Full pot data used by the home page and the always-visible header total.
 */
export async function computePotData(year = getCurrentSeasonYear(), yahooClient = null, leagueKey = null) {
        const settings = await getSettings();

        const [{ rows: allPaidRows }, { rows: yearPaidRows }, { rows: awardedRows }] = await Promise.all([
                query('SELECT COUNT(*)::int AS c FROM member_buyins WHERE paid = true'),
                query('SELECT COUNT(*)::int AS c FROM member_buyins WHERE paid = true AND year = $1', [year]),
                query('SELECT COALESCE(SUM(amount), 0) AS s FROM pot_ledger')
        ]);

        const totalPaidAll = allPaidRows[0]?.c ?? 0;
        const paidThisYear = yearPaidRows[0]?.c ?? 0;
        const totalAwarded = num(awardedRows[0]?.s);

        const potTotal = Math.max(0, totalPaidAll * settings.potShare - totalAwarded);

        const season = await getSeasonRecord(year);
        const poolContributed = paidThisYear * settings.poolShare;
        const paidOut =
                (season.firstPaid ? season.payoutFirst : 0) +
                (season.secondPaid ? season.payoutSecond : 0) +
                (season.thirdPaid ? season.payoutThird : 0);
        const payoutPoolRemaining = Math.max(0, poolContributed - paidOut);

        const history = await getChampionHistory(yahooClient, leagueKey);
        const championStatus = computeChampionStatus(history);

        return {
                year,
                settings,
                potTotal,
                paidThisYear,
                totalPaidAll,
                payoutPool: {
                        contributed: poolContributed,
                        paidOut,
                        remaining: payoutPoolRemaining,
                        first: { amount: season.payoutFirst, paid: season.firstPaid },
                        second: { amount: season.payoutSecond, paid: season.secondPaid },
                        third: { amount: season.payoutThird, paid: season.thirdPaid }
                },
                champion: championStatus,
                championHistory: history
        };
}

/**
 * Lightweight pot total only (used on every request for the header).
 */
export async function getPotTotal() {
        const settings = await getSettings();
        const [{ rows: allPaidRows }, { rows: awardedRows }] = await Promise.all([
                query('SELECT COUNT(*)::int AS c FROM member_buyins WHERE paid = true'),
                query('SELECT COALESCE(SUM(amount), 0) AS s FROM pot_ledger')
        ]);
        const totalPaidAll = allPaidRows[0]?.c ?? 0;
        const totalAwarded = num(awardedRows[0]?.s);
        return Math.max(0, totalPaidAll * settings.potShare - totalAwarded);
}

/**
 * Merges the live league members (from Yahoo) with persisted buy-in status for
 * the given season. Each member shows whether they've paid this year.
 */
export async function getMemberBuyins(year, leagueUsers = []) {
        const { rows } = await query('SELECT team_key, member_name, paid FROM member_buyins WHERE year = $1', [
                year
        ]);
        const byKey = new Map(rows.map((r) => [r.team_key, r]));

        const members = (leagueUsers || [])
                .map((u) => {
                        const teamKey = u?.metadata?.team_key || u?.user_id;
                        if (!teamKey) return null;
                        const name = u?.metadata?.team_name || u?.display_name || u?.username || 'Unknown Team';
                        const manager = u?.metadata?.manager_nickname || null;
                        const existing = byKey.get(teamKey);
                        return {
                                teamKey,
                                name,
                                manager,
                                paid: existing ? existing.paid : false
                        };
                })
                .filter(Boolean);

        return members;
}

/**
 * Commissioner page data: settings, this year's season record + payouts,
 * per-member buy-in list, computed pot, and champion history.
 */
export async function getCommissionerData(year, leagueUsers = [], yahooClient = null, leagueKey = null) {
        const [potData, season, members] = await Promise.all([
                computePotData(year, yahooClient, leagueKey),
                getSeasonRecord(year),
                getMemberBuyins(year, leagueUsers)
        ]);
        return { ...potData, season, members };
}
