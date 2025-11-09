import { redirect } from '@sveltejs/kit';
import { getYahooClient, createAuthenticatedClient } from '$lib/yahoo-adapter/yahooClient.js';
import { createSession } from '$lib/server/sessionStore.js';
import { getYahooLeagueUsers } from '$lib/yahoo-adapter/rosterAdapter.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

export async function GET({ url, cookies }) {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const storedState = cookies.get('oauth_state');
        
        if (!code) {
                return new Response('Authorization code not provided', { status: 400 });
        }
        
        if (!state || state !== storedState) {
                return new Response('Invalid state parameter', { status: 400 });
        }
        
        cookies.delete('oauth_state', { path: '/' });
        
        try {
                const yf = getYahooClient();
                if (!yf) {
                        return new Response('Yahoo client not initialized', { status: 500 });
                }
                
                const redirectUri = process.env.VITE_YAHOO_REDIRECT_URI || 
                                                        import.meta.env.VITE_YAHOO_REDIRECT_URI || 
                                                        `${url.origin}/auth/callback`;
                
                const tokenResponse = await yf.auth(code, redirectUri);
                
                if (!tokenResponse || !tokenResponse.access_token) {
                        return new Response('Failed to obtain access token', { status: 500 });
                }
                
                // SECURITY FIX: Create a temporary authenticated client instead of mutating the global singleton.
                // This prevents token leakage across different user sessions.
                const authenticatedClient = createAuthenticatedClient(
                        tokenResponse.access_token,
                        tokenResponse.refresh_token
                );
                
                let userGuid = null;
                try {
                        const userInfo = await authenticatedClient.user.games();
                        userGuid = userInfo?.users?.[0]?.user?.[0]?.guid || null;
                } catch (err) {
                        console.error('Error fetching user info:', err);
                }
                
                let managerInfo = null;
                if (userGuid && leagueID) {
                        try {
                                const users = await getYahooLeagueUsers(leagueID);
                                managerInfo = users.find(u => u.user_id === userGuid || u.metadata?.yahoo_guid === userGuid);
                        } catch (err) {
                                console.error('Error fetching league users:', err);
                        }
                }
                
                const sessionId = createSession(userGuid, tokenResponse, managerInfo);
                
                cookies.set('session_id', sessionId, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 7 * 24 * 60 * 60
                });
                
                throw redirect(302, '/');
        } catch (error) {
                if (error.status === 302) {
                        throw error;
                }
                console.error('OAuth callback error:', error);
                return new Response(`Authentication failed: ${error.message}`, { status: 500 });
        }
}
