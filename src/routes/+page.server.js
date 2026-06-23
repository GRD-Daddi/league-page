import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadNFLState } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { computePotData, getLastSeasonPodium } from '$lib/server/pot.js';
import { resolveSeasonPhase } from '$lib/utils/seasonPhase.js';

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
                // slot, excluding IR). Yahoo only exposes actual pick ownership via
                // draftresults AFTER a draft runs, so pre-draft each team shows one
                // pick per round.
                const rosterPositions = Array.isArray(leagueData?.roster_positions)
                        ? leagueData.roster_positions
                        : [];
                const draftRounds =
                        leagueData?.settings?.draft_rounds ||
                        rosterPositions.filter((p) => p !== 'IR').length ||
                        null;
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
