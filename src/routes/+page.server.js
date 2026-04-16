import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadNFLState } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';

export async function load({ locals }) {
	const nflState = await loadNFLState().catch(() => null);

	const isAuthenticated = !!locals?.session?.userId;

	if (!isAuthenticated) {
		return { nflState, leagueData: null, rosters: null, users: null, requiresAuth: true };
	}

	const { yahooClient, leagueKey } = locals;

	try {
		const [leagueData, rostersResult, users] = await waitForAll(
			loadLeagueData(yahooClient, leagueKey),
			loadLeagueRosters(yahooClient, leagueKey),
			loadLeagueUsers(yahooClient, leagueKey),
		);

		return {
			nflState,
			leagueData,
			rosters: rostersResult?.rosters ?? null,
			users,
			requiresAuth: false
		};
	} catch (error) {
		console.error('[homepage] Error loading data:', error.message);
		return { nflState, leagueData: null, rosters: null, users: null, error: error.message };
	}
}
