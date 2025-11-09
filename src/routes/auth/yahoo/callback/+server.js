import { redirect } from '@sveltejs/kit';
import { getYahooClient, createAuthenticatedClient } from '$lib/yahoo-adapter/yahooClient.js';
import { createSession } from '$lib/server/sessionStore.js';
import { getYahooLeagueUsers } from '$lib/yahoo-adapter/rosterAdapter.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

export async function GET({ url, cookies, request }) {
        const state = url.searchParams.get('state');
        const storedState = cookies.get('oauth_state');
        
        if (!state || state !== storedState) {
                return new Response('Invalid state parameter', { status: 400 });
        }
        
        cookies.delete('oauth_state', { path: '/' });
        
        const yf = getYahooClient();
        
        if (!yf) {
                return new Response('Yahoo API credentials not configured', { status: 500 });
        }
        
        return new Promise((resolve) => {
                const webRequest = {
                        url: url.toString(),
                        query: Object.fromEntries(url.searchParams.entries())
                };
                
                yf.authCallback(webRequest, async (error) => {
                        if (error) {
                                console.error('[OAuth Callback] Error:', error);
                                resolve(new Response(`Authentication failed: ${error.message}`, { status: 500 }));
                                return;
                        }
                        
                        try {
                                const accessToken = yf.yahooUserToken;
                                const refreshToken = yf.yahooRefreshToken;
                                
                                console.log('[OAuth Callback] Token exchange successful via module:', {
                                        hasAccessToken: !!accessToken,
                                        hasRefreshToken: !!refreshToken
                                });
                                
                                if (!accessToken) {
                                        resolve(new Response('Failed to obtain access token', { status: 500 }));
                                        return;
                                }
                                
                                const authenticatedClient = createAuthenticatedClient(accessToken, refreshToken);
                                
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
                                                const users = await getYahooLeagueUsers(leagueID, authenticatedClient);
                                                managerInfo = users.find(u => u.user_id === userGuid || u.metadata?.yahoo_guid === userGuid);
                                        } catch (err) {
                                                console.error('Error fetching league users:', err);
                                        }
                                }
                                
                                const tokenData = {
                                        access_token: accessToken,
                                        refresh_token: refreshToken,
                                        token_time: Date.now(),
                                        expires_in: 3600
                                };
                                
                                const sessionId = createSession(userGuid, tokenData, managerInfo);
                                
                                console.log('[OAuth Callback] Session created:', sessionId.substring(0, 10) + '...');
                                
                                cookies.set('session_id', sessionId, {
                                        httpOnly: true,
                                        secure: false,
                                        sameSite: 'lax',
                                        path: '/',
                                        maxAge: 7 * 24 * 60 * 60
                                });
                                
                                console.log('[OAuth Callback] Cookie set, redirecting to /');
                                
                                resolve(new Response(null, {
                                        status: 302,
                                        headers: {
                                                'Location': '/',
                                                'Set-Cookie': cookies.serialize('session_id', sessionId, {
                                                        httpOnly: true,
                                                        secure: false,
                                                        sameSite: 'lax',
                                                        path: '/',
                                                        maxAge: 7 * 24 * 60 * 60
                                                })
                                        }
                                });
                        } catch (err) {
                                console.error('[OAuth Callback] Error:', err);
                                resolve(new Response(`Authentication failed: ${err.message}`, { status: 500 }));
                        }
                });
        });
}
