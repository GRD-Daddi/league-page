import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadNFLState } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { computePotData, getPotWinners, getCurrentSeasonYear } from '$lib/server/pot.js';
import { getSeasonPodiums } from '$lib/server/archiveStats.js';
import { resolveSeasonPhase } from '$lib/utils/seasonPhase.js';
import { getYahooTradedPicks } from '$lib/yahoo-adapter/index.js';
import { getDraftPickOwnership } from '$lib/server/draftPicks.js';

// Numeric Yahoo team number (the "N" in "...t.N") from a team key.
function teamNumFromKey(teamKey) {
        if (!teamKey || typeof teamKey !== 'string') return null;
        const m = teamKey.match(/\.t\.(\d+)/);
        return m ? parseInt(m[1]) : null;
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
                        requiresAuth: true
                };
        }

        const { yahooClient, leagueKey } = locals;

        const authedPotData = await computePotData(undefined, yahooClient, leagueKey).catch((err) => {
                console.error('[homepage] Error loading pot data (authed):', err.message);
                return null;
        });

        try {
                const [leagueData, rostersResult, users] = await waitForAll(
                        loadLeagueData(yahooClient, leagueKey),
                        loadLeagueRosters(yahooClient, leagueKey),
                        loadLeagueUsers(yahooClient, leagueKey),
                );

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
                        rosters: rostersResult?.rosters ?? null,
                        users,
                        requiresAuth: false
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
                        error: error.message
                };
        }
}
