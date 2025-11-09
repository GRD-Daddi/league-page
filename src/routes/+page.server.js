import { fetchNFLState, fetchLeagueData, fetchLeagueRosters, fetchLeagueUsers } from '$lib/server/yahooService.js';

export async function load({ locals }) {
        try {
                // NFL state is public
                const nflState = await fetchNFLState();
                
                // Check if user is authenticated
                const isAuthenticated = !!locals?.session?.user_id;
                
                if (!isAuthenticated) {
                        console.log('[+page.server] Unauthenticated - league data requires login');
                        return {
                                nflState,
                                leagueData: null,
                                rosters: null,
                                users: null,
                                requiresAuth: true
                        };
                }
                
                // Authenticated users get full data
                const [leagueData, rosters, users] = await Promise.all([
                        fetchLeagueData(),
                        fetchLeagueRosters(),
                        fetchLeagueUsers()
                ]);

                return {
                        nflState,
                        leagueData,
                        rosters,
                        users,
                        requiresAuth: false
                };
        } catch (error) {
                console.error('[+page.server] Error loading homepage data:', error);
                
                // If authentication error, show login prompt
                const isAuthError = error?.description?.includes?.('logged in');
                
                if (isAuthError) {
                        const nflState = await fetchNFLState().catch(() => null);
                        return {
                                nflState,
                                leagueData: null,
                                rosters: null,
                                users: null,
                                requiresAuth: true
                        };
                }
                
                // Other errors
                return {
                        nflState: null,
                        leagueData: null,
                        rosters: null,
                        users: null,
                        error: error.message
                };
        }
}
