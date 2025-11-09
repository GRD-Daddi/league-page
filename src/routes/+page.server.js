import { fetchNFLState, fetchLeagueData, fetchLeagueRosters, fetchLeagueUsers } from '$lib/server/yahooService.js';

export async function load() {
        try {
                const [nflState, leagueData, rosters, users] = await Promise.all([
                        fetchNFLState(),
                        fetchLeagueData(),
                        fetchLeagueRosters(),
                        fetchLeagueUsers()
                ]);

                return {
                        nflState,
                        leagueData,
                        rosters,
                        users
                };
        } catch (error) {
                console.error('[+page.server] Error loading homepage data:', error);
                return {
                        nflState: null,
                        leagueData: null,
                        rosters: null,
                        users: null,
                        error: error.message
                };
        }
}
