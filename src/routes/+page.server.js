import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadNFLState, loadLeagueTransactions } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { computePotData, getPotWinners, getCurrentSeasonYear } from '$lib/server/pot.js';
import { getSeasonPodiums } from '$lib/server/archiveStats.js';
import { resolveSeasonPhase } from '$lib/utils/seasonPhase.js';
import { getYahooTradedPicks } from '$lib/yahoo-adapter/index.js';
import { getDraftPickOwnership } from '$lib/server/draftPicks.js';
import { getOpenVoteAlerts } from '$lib/server/votes.js';
import { getKeeperState } from '$lib/server/keepers.js';
import { KEEPER_MAX_SEASONS } from '$lib/utils/keeperRules.js';

// "Key players returning to the draft": rostered players who can no longer be
// kept because they hit the season cap AND were genuinely kept the full distance
// (a recorded keeper re-draft each eligible year). Requiring real keeper events
// excludes players that only LOOK maxed-out from missing transaction history
// (e.g. a 2023 draftee never actually kept) — those aren't the marquee names a
// team is forced to surrender, they're just data gaps.
function deriveReturningPlayers(keeperState, ownerByTeam) {
        const minKeptEvents = Math.max(1, KEEPER_MAX_SEASONS - 1);
        const seen = new Set();
        const out = [];
        for (const team of keeperState?.teams || []) {
                for (const p of team.players || []) {
                        if (!Number.isFinite(p.acquisitionYear)) continue; // lineage must be known & sane
                        // Genuinely cap-exhausted (not just any !eligibleByRules — guards against
                        // malformed/future acquisition years where remainingYears stays positive).
                        if (!(Number.isFinite(p.remainingYears) && p.remainingYears <= 0)) continue;
                        const keptEvents = (p.history || []).filter((h) => h.current && h.isKeeper).length;
                        if (keptEvents < minKeptEvents) continue; // must have gone the full distance
                        const key = `${p.teamKey}::${p.playerKey}`;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        out.push({
                                name: p.name,
                                pos: p.pos || null,
                                nflTeam: p.nflTeam || null,
                                img: p.img || null,
                                costRound: p.costRound || null,
                                sinceYear: p.acquisitionYear,
                                teamName: ownerByTeam.get(team.teamKey) || team.teamName || null
                        });
                }
        }
        // Cheapest-round keepers first (the stars kept on a bargain pick), then
        // longest-tenured, then name — surfaces the marquee names at the top.
        out.sort(
                (a, b) =>
                        (a.costRound || 99) - (b.costRound || 99) ||
                        (a.sinceYear || 0) - (b.sinceYear || 0) ||
                        a.name.localeCompare(b.name)
        );
        return out;
}

// Numeric Yahoo team number (the "N" in "...t.N") from a team key.
function teamNumFromKey(teamKey) {
        if (!teamKey || typeof teamKey !== 'string') return null;
        const m = teamKey.match(/\.t\.(\d+)/);
        return m ? parseInt(m[1]) : null;
}

// Short "Jun 28" date for a millisecond timestamp.
function shortDate(ms) {
        if (!ms) return '';
        const d = new Date(ms);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
}

// Turn raw Yahoo transactions into a compact "Recent Moves" feed for the
// homepage widget. Player names come straight from the Yahoo payload
// (players_meta), team names from the league owner list keyed by team number.
function buildRecentMoves(transactions, teamNameByNum, limit = 6) {
        if (!Array.isArray(transactions)) return [];
        const nameForTeam = (rosterId) =>
                teamNameByNum.get(rosterId) || (rosterId != null ? `Team ${rosterId}` : 'Free agency');
        return transactions
                .filter((t) => t && t.status !== 'failed' && t.status !== 'pending')
                .filter(
                        (t) =>
                                Object.keys(t.adds || {}).length ||
                                Object.keys(t.drops || {}).length ||
                                (t.draft_picks || []).length
                )
                .sort((a, b) => (b.created || 0) - (a.created || 0))
                .slice(0, limit)
                .map((t) => {
                        const meta = t.players_meta || {};
                        const toPlayer = ([pk, rosterId]) => ({
                                name: meta[pk]?.name || 'Player',
                                pos: meta[pk]?.pos || null,
                                team: meta[pk]?.team || null,
                                teamName: nameForTeam(rosterId)
                        });
                        const adds = Object.entries(t.adds || {}).map(toPlayer);
                        const drops = Object.entries(t.drops || {}).map(toPlayer);
                        let typeLabel = 'Move';
                        if (t.type === 'trade') typeLabel = 'Trade';
                        else if (t.type === 'waiver') typeLabel = 'Waiver';
                        else if (t.type === 'free_agent') typeLabel = 'Free Agent';
                        return {
                                id: t.transaction_id,
                                type: t.type,
                                typeLabel,
                                dateLabel: shortDate(t.created),
                                teams: (t.roster_ids || []).map(nameForTeam),
                                adds,
                                drops,
                                bid: t.settings?.waiver_bid || 0
                        };
                });
}

export async function load({ locals, url }) {
        const nflState = await loadNFLState().catch(() => null);

        const isAuthenticated = !!locals?.session?.userId;

        // The auth guard sends logged-out users here with ?loginRequired=<path>
        // so we can return them to the page they wanted after they log in. Only
        // accept same-origin relative paths to avoid open-redirect abuse.
        const requested = url.searchParams.get('loginRequired');
        const loginReturnTo = requested && /^\/(?!\/)/.test(requested) ? requested : null;

        const potWinners = await getPotWinners().catch((err) => {
                console.error('[homepage] Error loading pot winners:', err.message);
                return [];
        });

        if (!isAuthenticated) {
                // Logged-out visitors see the hero + a login prompt only. League data
                // (pot, payout pool, person-to-beat, trophy room, standings) is gated
                // behind auth and never sent to the client until the user logs in.
                return {
                        nflState,
                        potData: null,
                        potWinners: [],
                        loginReturnTo,
                        seasonPhase: resolveSeasonPhase(nflState, null),
                        lastSeasonPodium: null,
                        leagueData: null,
                        rosters: null,
                        users: null,
                        requiresAuth: true,
                        voteAlerts: null
                };
        }

        // Open-vote nudge for the in-app banner: which open votes this owner still
        // needs to weigh in on, with deadline-approaching reminders. Best-effort —
        // a votes-table hiccup must never break the homepage.
        const voteAlerts = await getOpenVoteAlerts(locals.session).catch((err) => {
                console.error('[homepage] Error loading vote alerts:', err.message);
                return null;
        });

        const { yahooClient, leagueKey } = locals;

        const authedPotData = await computePotData(undefined, yahooClient, leagueKey).catch((err) => {
                console.error('[homepage] Error loading pot data (authed):', err.message);
                return null;
        });

        try {
                const [leagueData, rostersResult, users, recentTransactions] = await waitForAll(
                        loadLeagueData(yahooClient, leagueKey),
                        loadLeagueRosters(yahooClient, leagueKey),
                        loadLeagueUsers(yahooClient, leagueKey),
                        // No week filter → Yahoo returns the league's most recent transactions,
                        // which is exactly what the "Recent Moves" widget wants.
                        loadLeagueTransactions(yahooClient, leagueKey).catch((err) => {
                                console.error('[homepage] Error loading recent transactions:', err.message);
                                return [];
                        }),
                );

                // Team display names keyed by Yahoo team number, for labelling moves.
                const teamNameByNum = new Map();
                for (const u of users || []) {
                        const num = teamNumFromKey(u?.metadata?.team_key);
                        if (num != null) {
                                teamNameByNum.set(
                                        num,
                                        u?.metadata?.manager_nickname || u?.metadata?.team_name || `Team ${num}`
                                );
                        }
                }
                const recentMoves = buildRecentMoves(recentTransactions, teamNameByNum);

                const seasonPhase = resolveSeasonPhase(nflState, leagueData);
                // Draft rounds: prefer Yahoo's configured num_draft_rounds (correct for
                // keeper/dynasty leagues), else fall back to roster size (one pick per
                // slot, excluding IR).
                const rosterPositions = Array.isArray(leagueData?.roster_positions)
                        ? leagueData.roster_positions
                        : [];
                // Largest roster size across loaded teams (counts kept/drafted players)
                // as a secondary signal when league settings don't expose round counts.
                const maxRosterSize = Object.values(rostersResult?.rosters ?? {}).reduce((max, r) => {
                        const size = Array.isArray(r?.players) ? r.players.length : 0;
                        return Math.max(max, size);
                }, 0);
                const DEFAULT_DRAFT_ROUNDS = 15;
                let draftRounds =
                        leagueData?.settings?.draft_rounds ||
                        rosterPositions.filter((p) => p !== 'IR').length ||
                        maxRosterSize ||
                        DEFAULT_DRAFT_ROUNDS;

                // Real per-team upcoming-draft pick ownership. Each team starts with one
                // pick per round; traded picks move a pick from its original team to its
                // current owner, so a team can end up with two picks in a round (or none).
                // Keyed by the numeric Yahoo team number parsed from each roster's team_key.
                let draftPicksByTeam = null;
                if (draftRounds) {
                        try {
                                const tradedPicks = await getYahooTradedPicks(leagueKey, yahooClient);
                                const rosters = Object.values(rostersResult?.rosters ?? {});
                                draftPicksByTeam = {};
                                for (const r of rosters) {
                                        const num = teamNumFromKey(r?.metadata?.team_key);
                                        if (num == null) continue;
                                        const rounds = {};
                                        for (let i = 1; i <= draftRounds; i++) rounds[i] = 1;
                                        draftPicksByTeam[num] = rounds;
                                }
                                for (const pick of tradedPicks) {
                                        const { round, roster_id: original, owner_id: owner } = pick;
                                        if (!round || round > draftRounds) continue;
                                        if (draftPicksByTeam[original]) {
                                                draftPicksByTeam[original][round] = Math.max(
                                                        0,
                                                        (draftPicksByTeam[original][round] || 0) - 1
                                                );
                                        }
                                        if (draftPicksByTeam[owner]) {
                                                draftPicksByTeam[owner][round] =
                                                        (draftPicksByTeam[owner][round] || 0) + 1;
                                        }
                                }
                        } catch (err) {
                                console.error('[homepage] Error loading traded draft picks:', err.message);
                                draftPicksByTeam = null;
                        }
                }

                // The commissioner-maintained pick ownership (set on the commissioner page
                // and stored in the DB) is authoritative. When present, it overrides the
                // Yahoo traded-pick estimate so the homepage matches what was entered.
                let draftPicksSource = draftPicksByTeam ? 'yahoo' : null;
                try {
                        const ownership = await getDraftPickOwnership(getCurrentSeasonYear());
                        if (ownership?.teams?.length) {
                                const map = {};
                                for (const t of ownership.teams) {
                                        const num = teamNumFromKey(t.teamKey);
                                        if (num == null) continue;
                                        const rounds = {};
                                        for (let i = 1; i <= ownership.rounds; i++) {
                                                rounds[i] = t.picks[i - 1] ?? 0;
                                        }
                                        map[num] = rounds;
                                }
                                if (Object.keys(map).length > 0) {
                                        draftPicksByTeam = map;
                                        draftRounds = ownership.rounds;
                                        draftPicksSource = 'commissioner';
                                }
                        }
                } catch (err) {
                        console.error('[homepage] Error loading commissioner draft picks:', err.message);
                }
                // Pre-draft pick order (set by the commissioner in Yahoo), keyed by
                // Yahoo team number -> draft slot (1 = first overall). Null when no
                // order has been assigned yet.
                let draftOrder = null;
                {
                        const order = {};
                        for (const r of Object.values(rostersResult?.rosters ?? {})) {
                                const num = teamNumFromKey(r?.metadata?.team_key);
                                const pos = r?.metadata?.draft_position;
                                if (num != null && pos) order[num] = pos;
                        }
                        if (Object.keys(order).length > 0) draftOrder = order;
                }

                // The trophy band shows the most recent completed season's podium.
                // Sourced from the CANONICAL archive (season_archive champion/runner_up/
                // third) — the same data the Awards/Records pages use — never derived live
                // from Yahoo rosters, which drift between loads and re-corrupt finalized
                // standings. This keeps the homepage top-3 stable and consistent everywhere.
                const lastSeasonPodium = await getSeasonPodiums()
                        .then((podiums) => {
                                const latest = podiums?.[0] ?? null;
                                if (!latest) return null;
                                return {
                                        year: latest.year,
                                        podium: (latest.podium ?? []).map((p) => ({
                                                place: p.rank,
                                                name: p.teamName,
                                                ownerName: p.ownerName,
                                                teamKey: p.teamKey,
                                                logo: null
                                        }))
                                };
                        })
                        .catch((err) => {
                                console.error('[homepage] Error loading last season podium:', err.message);
                                return null;
                        });

                // Marquee players forced back into the draft pool — only computed during the
                // preseason/offseason draft-prep window, when the homepage actually shows
                // this section. Reuses the per-viewer keeper cache so it adds no extra Yahoo
                // load on top of the Keepers page. Best-effort: never break the homepage.
                let returningPlayers = null;
                if (seasonPhase === 'preseason' || seasonPhase === 'offseason') {
                        try {
                                const keeperState = await getKeeperState(
                                        getCurrentSeasonYear(),
                                        yahooClient,
                                        leagueKey,
                                        locals.session?.userId || null
                                );
                                const ownerByTeam = new Map();
                                for (const u of users || []) {
                                        const tk = u?.metadata?.team_key;
                                        if (tk) ownerByTeam.set(tk, u?.metadata?.manager_nickname || u?.metadata?.team_name || null);
                                }
                                returningPlayers = deriveReturningPlayers(keeperState, ownerByTeam);
                        } catch (err) {
                                console.error('[homepage] Error computing returning players:', err.message);
                                returningPlayers = null;
                        }
                }

                return {
                        nflState,
                        potData: authedPotData,
                        potWinners,
                        seasonPhase,
                        lastSeasonPodium,
                        leagueData,
                        draftRounds,
                        draftPicksByTeam,
                        draftPicksSource,
                        draftOrder,
                        returningPlayers,
                        keeperMaxSeasons: KEEPER_MAX_SEASONS,
                        rosters: rostersResult?.rosters ?? null,
                        users,
                        recentMoves,
                        requiresAuth: false,
                        voteAlerts
                };
        } catch (error) {
                console.error('[homepage] Error loading data:', error.message);
                return {
                        nflState,
                        potData: authedPotData,
                        potWinners,
                        seasonPhase: resolveSeasonPhase(nflState, null),
                        lastSeasonPodium: null,
                        leagueData: null,
                        rosters: null,
                        users: null,
                        error: error.message,
                        voteAlerts
                };
        }
}
