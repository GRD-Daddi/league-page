import { query } from './db.js';
import { ownerDisplayName } from '../utils/ownerNames.js';
import { loadLeagueData, loadLeagueRosters } from './dataLoaders.js';
import { getArchivedChampions, snapshotPodium, snapshotSeasonHeader, snapshotStandings, snapshotMatchups } from './archive.js';
import { enumerateLeagueSeasons, fetchLeagueMeta, fetchSeasonArchiveData } from './historyBackfill.js';
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
        const { rows } = await query('SELECT buy_in_amount, pot_split_pct, pot_adjustment, points_leader_amount FROM pot_settings WHERE id = 1');
        const row = rows[0] || {};
        const buyIn = num(row.buy_in_amount, 150);
        const potSplitPct = num(row.pot_split_pct, 50);
        return {
                buyIn,
                potSplitPct,
                potAdjustment: num(row.pot_adjustment, 0),
                pointsLeaderAmount: num(row.points_leader_amount, 10),
                potShare: buyIn * (potSplitPct / 100),
                poolShare: buyIn * ((100 - potSplitPct) / 100)
        };
}

/**
 * Sets the carryover pot to an exact dollar amount by storing the offset needed
 * to reach it from the derived total (paid buy-ins minus awarded pots). Paid
 * buy-ins continue to accumulate on top of the entered amount afterwards.
 */
export async function setManualPotTotal(targetValue) {
        const target = Number.isFinite(targetValue) && targetValue >= 0 ? targetValue : 0;
        const settings = await getSettings();
        const [{ rows: allPaidRows }, { rows: awardedRows }] = await Promise.all([
                query('SELECT COUNT(*)::int AS c FROM member_buyins WHERE paid = true'),
                query('SELECT COALESCE(SUM(amount), 0) AS s FROM pot_ledger')
        ]);
        const totalPaidAll = allPaidRows[0]?.c ?? 0;
        const totalAwarded = num(awardedRows[0]?.s);
        const baseWithoutAdjustment = totalPaidAll * settings.potShare - totalAwarded;
        const adjustment = target - baseWithoutAdjustment;
        await query('UPDATE pot_settings SET pot_adjustment = $1, updated_at = now() WHERE id = 1', [adjustment]);
        return target;
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
                        firstEnabled: true,
                        secondEnabled: true,
                        thirdEnabled: true,
                        championTeamKey: null,
                        championName: null,
                        championRecorded: false,
                        championSource: null,
                        pointsLeaderTeamKey: null,
                        pointsLeaderName: null,
                        pointsLeaderRecorded: false,
                        pointsLeaderPaid: false
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
                firstEnabled: row.first_enabled !== false,
                secondEnabled: row.second_enabled !== false,
                thirdEnabled: row.third_enabled !== false,
                championTeamKey: row.champion_team_key,
                championName: row.champion_name,
                championRecorded: row.champion_recorded,
                championSource: row.champion_source,
                pointsLeaderTeamKey: row.points_leader_team_key,
                pointsLeaderName: row.points_leader_name,
                pointsLeaderRecorded: row.points_leader_recorded === true,
                pointsLeaderPaid: row.points_leader_paid === true
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

        // Fill gaps from the durable archive (e.g. last season's champion captured
        // from the podium) so the reigning champ resolves even when no live Yahoo
        // call is available and no champion was manually recorded. Never overrides a
        // season already present (manual/recorded entries take precedence).
        try {
                const archived = await getArchivedChampions();
                for (const champ of archived) {
                        if (!champ?.name || byYear.has(champ.year)) continue;
                        byYear.set(champ.year, { ...champ, source: 'archive' });
                }
        } catch (err) {
                console.error('[pot] archived champion merge failed:', err.message);
        }

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
 * Last season's podium (1st/2nd/3rd), resolved from the *current* league's
 * teams via each team's `previous_season_team_rank` (the manager's finish in the
 * prior season). This avoids walking the renew chain and works even before the
 * previous league is marked complete. Team name/logo are the current ones, so a
 * manager who placed top-3 last year shows under their present team. Returns null
 * when no team carries a prior-season rank (e.g. the league's first season).
 */
export async function getLastSeasonPodium(yahooClient = null, leagueKey = null) {
        if (!yahooClient || !leagueKey) return null;
        try {
                const [leagueData, rostersResult] = await Promise.all([
                        loadLeagueData(yahooClient, leagueKey),
                        loadLeagueRosters(yahooClient, leagueKey)
                ]);

                // previous_season_team_rank describes the season before this league's,
                // so the podium year is the current season minus one.
                const season = parseInt(leagueData?.season, 10);
                const year = Number.isFinite(season) ? season - 1 : null;

                const rosters = rostersResult?.rosters ? Object.values(rostersResult.rosters) : [];
                const ranked = rosters
                        .map((r) => ({ r, prevRank: parseInt(r?.metadata?.previous_season_rank, 10) }))
                        .filter((x) => Number.isFinite(x.prevRank) && x.prevRank >= 1 && x.prevRank <= 3)
                        .sort((a, b) => a.prevRank - b.prevRank);
                if (ranked.length === 0) return null;

                const podium = ranked.map(({ r, prevRank }) => ({
                        place: prevRank,
                        name: r.metadata?.team_name || 'Unknown Team',
                        teamKey: r.metadata?.team_key || null,
                        logo: r.metadata?.team_logo || null,
                        // Win/loss/PF on the team object are this season's, not last
                        // season's, so omit them — the UI hides the meta line when null.
                        wins: null,
                        losses: null,
                        pointsFor: null
                }));

                // Attach the OWNER (manager nickname) to each podium entry from the
                // durable archive so the UI can lead with the owner, not the team name.
                // Match on place (1/2/3) against the archived final_rank, which is the
                // authoritative final placement and carries manager_name. Best effort.
                if (Number.isFinite(year) && podium.length) {
                        try {
                                const { rows } = await query(
                                        `SELECT final_rank, team_name, manager_name
                                         FROM team_season_archive
                                         WHERE year = $1 AND final_rank BETWEEN 1 AND 3
                                           AND manager_name IS NOT NULL AND trim(manager_name) <> ''`,
                                        [year]
                                );
                                const byPlace = new Map(rows.map((r) => [r.final_rank, r]));
                                for (const p of podium) {
                                        const a = byPlace.get(p.place);
                                        if (!a) continue;
                                        p.owner = a.manager_name;
                                        p.ownerName = ownerDisplayName(a.manager_name);
                                        // The archived team name is last season's actual name; prefer it
                                        // over the current-season roster name (which may have been renamed).
                                        if (a.team_name) p.name = a.team_name;
                                }
                        } catch (err) {
                                console.error('[pot] podium owner enrich failed:', err.message);
                        }
                }

                // Persist last season's podium into the durable archive so the champion
                // (and "person to beat") survive even if Yahoo later goes dark. Best
                // effort — a snapshot failure must never break the live podium.
                if (Number.isFinite(year)) {
                        // Never re-snapshot a season the authoritative backfill already
                        // captured as complete. This podium is derived from the CURRENT
                        // league's rosters (current-league team keys, no manager_name), so
                        // writing it into a finalized past season re-stamps that season with
                        // wrong-league team keys and null-owner rows AND flips
                        // season_archive's champion back to the current-league key — silently
                        // re-corrupting the finalized standings on every authenticated load.
                        let alreadyArchived = false;
                        try {
                                const { rows: ex } = await query(
                                        `SELECT status FROM season_archive WHERE year = $1`,
                                        [year]
                                );
                                alreadyArchived = ex?.[0]?.status === 'complete';
                        } catch (err) {
                                console.error('[pot] podium archive-status check failed:', err.message);
                        }
                        if (!alreadyArchived) {
                                try {
                                        await snapshotPodium(year, podium, {
                                                leagueKey,
                                                leagueName: leagueData?.name || null,
                                                numTeams: rosters.length || null
                                        });
                                } catch (err) {
                                        console.error('[pot] podium snapshot failed:', err.message);
                                }
                        }
                }

                return { year, podium };
        } catch (err) {
                console.error('[pot] podium lookup failed:', err.message);
                return null;
        }
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

        const potTotal = Math.max(0, totalPaidAll * settings.potShare - totalAwarded + settings.potAdjustment);

        const season = await getSeasonRecord(year);
        const poolContributed = paidThisYear * settings.poolShare;
        const paidOut =
                (season.firstEnabled && season.firstPaid ? season.payoutFirst : 0) +
                (season.secondEnabled && season.secondPaid ? season.payoutSecond : 0) +
                (season.thirdEnabled && season.thirdPaid ? season.payoutThird : 0);
        const payoutPoolRemaining = Math.max(0, poolContributed - paidOut);

        // End-of-year points-leader bonus. Every member chips in a fixed amount
        // (settings.pointsLeaderAmount) directly to the season's points leader,
        // separate from the carryover pot and the payout pool. The leader doesn't
        // pay themselves, so the total they collect is amount × (members − 1).
        const { rows: memberCountRows } = await query(
                'SELECT COUNT(*)::int AS c FROM member_buyins WHERE year = $1',
                [year]
        );
        const pointsLeaderMembers = memberCountRows[0]?.c ?? 0;

        // Projection for the upcoming/active season. Buy-ins are collected over
        // time, so the pool and carryover pot read $0 until members actually pay.
        // We infer what they WILL be once everyone pays, using the league's team
        // count as the expected member count, and flag the figures as estimates
        // until all funds are in.
        const { rows: teamCountRows } = await query(
                'SELECT num_teams FROM season_archive WHERE year = $1',
                [year]
        );
        const expectedMembers = num(teamCountRows[0]?.num_teams) || pointsLeaderMembers || 0;
        const unpaidMembers = Math.max(0, expectedMembers - paidThisYear);
        const fullyCollected = expectedMembers > 0 && paidThisYear >= expectedMembers;
        const projection = {
                expectedMembers,
                paidMembers: paidThisYear,
                unpaidMembers,
                fullyCollected,
                outstanding: unpaidMembers * settings.buyIn,
                payoutPoolProjected: Math.max(0, expectedMembers * settings.poolShare - paidOut),
                potTotalProjected: Math.max(0, potTotal + unpaidMembers * settings.potShare)
        };
        const pointsLeaderContributors = Math.max(0, pointsLeaderMembers - 1);
        const pointsLeader = {
                amount: settings.pointsLeaderAmount,
                members: pointsLeaderMembers,
                contributors: pointsLeaderContributors,
                total: settings.pointsLeaderAmount * pointsLeaderContributors,
                name: season.pointsLeaderName,
                teamKey: season.pointsLeaderTeamKey,
                recorded: season.pointsLeaderRecorded,
                paid: season.pointsLeaderPaid
        };

        const history = await getChampionHistory(yahooClient, leagueKey);
        const championStatus = computeChampionStatus(history);

        // Per the pot rule, the "person to beat" is last season's champion ONLY while
        // they have not yet claimed the pot — i.e. their reigning win was their first
        // in a row. Once they go back-to-back AND the pot is awarded, the throne
        // resets and there's no one to beat until a new champion emerges.
        let potClaimed = false;
        if (championStatus.reigning) {
                const { rows: claimRows } = await query(
                        `SELECT 1 FROM pot_ledger
                         WHERE year = $1 AND (
                                 (winner_team_key IS NOT NULL AND winner_team_key = $2)
                                 OR (winner_name IS NOT NULL AND LOWER(winner_name) = LOWER($3))
                         )
                         LIMIT 1`,
                        [championStatus.reigning.year, championStatus.reigning.teamKey, championStatus.reigning.name]
                );
                potClaimed = claimRows.length > 0;
        }

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
                        first: { amount: season.payoutFirst, paid: season.firstPaid, enabled: season.firstEnabled },
                        second: { amount: season.payoutSecond, paid: season.secondPaid, enabled: season.secondEnabled },
                        third: { amount: season.payoutThird, paid: season.thirdPaid, enabled: season.thirdEnabled }
                },
                pointsLeader,
                projection,
                champion: { ...championStatus, potClaimed },
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
        return Math.max(0, totalPaidAll * settings.potShare - totalAwarded + settings.potAdjustment);
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

/**
 * Permanent record of who has won (claimed) the carryover pot, oldest-first. The
 * pot is only ever awarded after a back-to-back title, so each win's "span" is the
 * two-season streak that earned it (e.g. "2024–2025"). Reads straight from the
 * pot_ledger so it survives independent of any live Yahoo call.
 */
export async function getPotWinners() {
        const { rows } = await query(
                `SELECT year, winner_team_key, winner_name, amount, note, created_at
                 FROM pot_ledger
                 WHERE winner_name IS NOT NULL OR winner_team_key IS NOT NULL
                 ORDER BY year ASC NULLS LAST, created_at ASC`
        );
        return rows.map((r) => {
                const year = Number.isFinite(r.year) ? r.year : parseInt(r.year, 10);
                const span = Number.isFinite(year) ? `${year - 1}\u2013${year}` : null;
                return {
                        year: Number.isFinite(year) ? year : null,
                        teamKey: r.winner_team_key || null,
                        name: r.winner_name || null,
                        amount: num(r.amount),
                        span,
                        note: r.note || null,
                        wonAt: r.created_at
                };
        });
}

/**
 * Commissioner one-click backfill. Yahoo's `previous_league_id` renew links are
 * null for this league, so instead of walking a (broken) chain we enumerate every
 * season of this league directly from the logged-in user's NFL games, then pull
 * each season's REAL standings and matchup scores straight from Yahoo's REST
 * endpoints (via historyBackfill, which bypasses the offseason-broken library
 * helpers that previously captured only names with zeroed stats). Champions are
 * derived from each finished season's true rank-1 finish. Best-effort per season
 * — one failing must not abort the rest. Returns a per-season summary.
 */
export async function backfillArchive(yahooClient = null, leagueKey = null) {
        if (!yahooClient) {
                return { ok: false, error: 'Yahoo login required to backfill the archive.', seasons: [] };
        }

        // Resolve this league's name so we only capture seasons of THIS league.
        let leagueName = null;
        try {
                if (leagueKey) leagueName = (await fetchLeagueMeta(yahooClient, leagueKey))?.name || null;
        } catch (err) {
                console.error('[pot] backfill: league name lookup failed:', err.message);
        }

        let seasonList = [];
        try {
                seasonList = await enumerateLeagueSeasons(yahooClient, leagueName);
        } catch (err) {
                return { ok: false, error: `Could not list seasons: ${err.message}`, seasons: [] };
        }
        if (!seasonList.length && leagueKey) {
                seasonList = [{ year: getCurrentSeasonYear(), leagueKey, name: leagueName, numTeams: null }];
        }

        const seasons = [];
        for (const s of seasonList) {
                try {
                        const { meta, standings, sides } = await fetchSeasonArchiveData(yahooClient, s.leagueKey);
                        const year = Number.isFinite(meta.season) ? meta.season : s.year;
                        if (!Number.isFinite(year)) {
                                seasons.push({ leagueKey: s.leagueKey, ok: false, error: 'Could not resolve season year.' });
                                continue;
                        }

                        await snapshotSeasonHeader(year, {
                                leagueKey: s.leagueKey,
                                leagueName: meta.name || s.name || null,
                                status: meta.isFinished ? 'complete' : (meta.status || null),
                                numTeams: meta.numTeams || standings.length || null
                        });
                        await snapshotStandings(year, standings);
                        if (sides.length) await snapshotMatchups(year, sides);

                        // Champion + podium from REAL final standings, but only for a finished
                        // season — an in-progress season's ranks aren't final yet.
                        if (meta.isFinished && standings.length) {
                                const ranked = standings
                                        .filter((t) => Number.isFinite(t.finalRank))
                                        .sort((a, b) => a.finalRank - b.finalRank);
                                const podium = ranked
                                        .filter((t) => t.finalRank >= 1 && t.finalRank <= 3)
                                        .map((t) => ({ place: t.finalRank, name: t.teamName, teamKey: t.teamKey, logo: t.logoUrl }));
                                if (podium.length) {
                                        await snapshotPodium(year, podium, {
                                                leagueKey: s.leagueKey,
                                                leagueName: meta.name || s.name || null,
                                                numTeams: meta.numTeams || standings.length
                                        });
                                }
                                const champ = ranked.find((t) => t.finalRank === 1);
                                if (champ) await recordAutoChampion(year, champ.teamKey, champ.teamName);
                        }

                        seasons.push({
                                leagueKey: s.leagueKey,
                                year,
                                ok: true,
                                teams: standings.length,
                                weeks: new Set(sides.map((x) => x.week)).size,
                                name: meta.name || s.name || null
                        });
                } catch (err) {
                        console.error('[pot] backfill failed for', s.leagueKey, err.message);
                        seasons.push({ leagueKey: s.leagueKey, ok: false, error: err.message });
                }
        }

        const captured = seasons.filter((s) => s.ok);
        return {
                ok: captured.length > 0,
                count: captured.length,
                seasons: seasons.sort((a, b) => (b.year || 0) - (a.year || 0))
        };
}
