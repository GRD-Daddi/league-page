import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadNFLState } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { computePotData } from '$lib/server/pot.js';

export async function load({ locals }) {
        const nflState = await loadNFLState().catch(() => null);

        const potData = await computePotData().catch((err) => {
                console.error('[homepage] Error loading pot data:', err.message);
                return null;
        });

        const isAuthenticated = !!locals?.session?.userId;

        if (!isAuthenticated) {
                return { nflState, potData, leagueData: null, rosters: null, users: null, requiresAuth: true };
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

                return {
                        nflState,
                        potData: authedPotData,
                        leagueData,
                        rosters: rostersResult?.rosters ?? null,
                        users,
                        requiresAuth: false
                };
        } catch (error) {
                console.error('[homepage] Error loading data:', error.message);
                return { nflState, potData: authedPotData, leagueData: null, rosters: null, users: null, error: error.message };
        }
}
