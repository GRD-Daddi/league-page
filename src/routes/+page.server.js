import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadNFLState } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { computePotData, getLastSeasonPodium } from '$lib/server/pot.js';
import { resolveSeasonPhase } from '$lib/utils/seasonPhase.js';
import { getYahooTradedPicks } from '$lib/yahoo-adapter/index.js';

// Numeric Yahoo team number (the "N" in "...t.N") from a team key.
function teamNumFromKey(teamKey) {
        if (!teamKey || typeof teamKey !== 'string') return null;
        const m = teamKey.match(/\.t\.(\d+)/);
        return m ? parseInt(m[1]) : null;
}

export async function load({ locals }) {
        const nflState = await loadNFLState().catch(() => null);

        const potData = await computePotData().catch((err) => {
                console.error('[homepage] Error loading pot data:', err.message);
                return null;
        });

        const isAuthenticated = !!locals?.session?.userId;

        if (!isAuthenticated) {
                return {
                        nflState,
                        potData,
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
                return potData;
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
                const draftRounds =
                        leagueData?.settings?.draft_rounds ||
                        rosterPositions.filter((p) => p !== 'IR').length ||
                        null;

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
                // The trophy band is shown in every phase, so the podium is fetched for any
                // authenticated user (null when Yahoo has no completed season to resolve).
                const lastSeasonPodium = await getLastSeasonPodium(yahooClient, leagueKey).catch((err) => {
                        console.error('[homepage] Error loading last season podium:', err.message);
                        return null;
                });

                return {
                        nflState,
                        potData: authedPotData,
                        seasonPhase,
                        lastSeasonPodium,
                        leagueData,
                        draftRounds,
                        draftPicksByTeam,
                        rosters: rostersResult?.rosters ?? null,
                        users,
                        requiresAuth: false
                };
        } catch (error) {
                console.error('[homepage] Error loading data:', error.message);
                return {
                        nflState,
                        potData: authedPotData,
                        seasonPhase: resolveSeasonPhase(nflState, null),
                        lastSeasonPodium: null,
                        leagueData: null,
                        rosters: null,
                        users: null,
                        error: error.message
                };
        }
}
