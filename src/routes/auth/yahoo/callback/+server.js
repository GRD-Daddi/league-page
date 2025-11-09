import { createAuthenticatedClient } from '$lib/yahoo-adapter/yahooClient.js';
import { createSession } from '$lib/server/sessionStore.js';
import { getYahooLeagueUsers } from '$lib/yahoo-adapter/rosterAdapter.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

export async function GET({ url, cookies, fetch }) {
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
                const appKey = process.env.VITE_YAHOO_APP_KEY || import.meta.env.VITE_YAHOO_APP_KEY;
                const appSecret = process.env.VITE_YAHOO_APP_SECRET || import.meta.env.VITE_YAHOO_APP_SECRET;
                const redirectUri = process.env.VITE_YAHOO_REDIRECT_URI || 
                                                        import.meta.env.VITE_YAHOO_REDIRECT_URI || 
                                                        `${url.origin}/auth/yahoo/callback`;
                
                if (!appKey || !appSecret) {
                        return new Response('Yahoo API credentials not configured', { status: 500 });
                }
                
                // Exchange authorization code for tokens
                const authHeader = Buffer.from(`${appKey}:${appSecret}`, 'binary').toString('base64');
                const tokenParams = new URLSearchParams({
                        client_id: appKey,
                        client_secret: appSecret,
                        redirect_uri: redirectUri,
                        code: code,
                        grant_type: 'authorization_code'
                });
                
                const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
                        method: 'POST',
                        headers: {
                                'Authorization': `Basic ${authHeader}`,
                                'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: tokenParams.toString()
                });
                
                if (!tokenResponse.ok) {
                        const errorText = await tokenResponse.text();
                        console.error('[OAuth] Token exchange failed:', errorText);
                        return new Response(`Failed to obtain access token: ${errorText}`, { status: 500 });
                }
                
                const tokens = await tokenResponse.json();
                
                if (!tokens || !tokens.access_token) {
                        return new Response('Failed to obtain access token', { status: 500 });
                }
                
                console.log('[OAuth] ✅ Tokens obtained');
                
                // Create authenticated client
                const authenticatedClient = createAuthenticatedClient(
                        tokens.access_token,
                        tokens.refresh_token
                );
                
                // Get user GUID
                let userGuid = null;
                try {
                        const userInfo = await authenticatedClient.user.games();
                        console.log('[OAuth] User info response:', JSON.stringify(userInfo, null, 2));
                        userGuid = userInfo?.users?.[0]?.user?.[0]?.guid || null;
                        console.log('[OAuth] ✅ User GUID:', userGuid);
                } catch (err) {
                        console.error('[OAuth] Error fetching user info:', err.message);
                        console.error('[OAuth] Full error:', JSON.stringify(err, null, 2));
                }
                
                // Get manager info
                let managerInfo = null;
                if (userGuid && leagueID) {
                        try {
                                const users = await getYahooLeagueUsers(leagueID, authenticatedClient);
                                managerInfo = users.find(u => u.user_id === userGuid || u.metadata?.yahoo_guid === userGuid);
                                console.log('[OAuth] ✅ Manager:', managerInfo?.name || 'not found');
                        } catch (err) {
                                console.error('[OAuth] Error fetching league users:', err);
                        }
                }
                
                // Create session
                const tokenData = {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        token_time: Date.now(),
                        expires_in: tokens.expires_in || 3600
                };
                
                const sessionId = createSession(userGuid, tokenData, managerInfo);
                console.log('[OAuth] ✅ Session created:', sessionId.substring(0, 10) + '...');
                
                // Set cookie with explicit header
                const cookieValue = cookies.serialize('session_id', sessionId, {
                        httpOnly: true,
                        secure: false,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 7 * 24 * 60 * 60
                });
                
                console.log('[OAuth] ✅ Redirecting with cookie');
                
                return new Response(null, {
                        status: 302,
                        headers: {
                                'Location': '/',
                                'Set-Cookie': cookieValue
                        }
                });
        } catch (error) {
                console.error('[OAuth] Error:', error);
                return new Response(`Authentication failed: ${error.message}`, { status: 500 });
        }
}
