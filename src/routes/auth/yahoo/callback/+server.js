import { redirect } from '@sveltejs/kit';
import { createAuthenticatedClient } from '$lib/yahoo-adapter/yahooClient.js';
import { createSession } from '$lib/server/sessionStore.js';
import { getYahooLeagueUsers } from '$lib/yahoo-adapter/rosterAdapter.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

// A valid Yahoo league key looks like "449.l.12345" — starts with a numeric game key.
function isValidLeagueKey(key) {
        return typeof key === 'string' && /^\d+\.l\.\d+$/.test(key);
}

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

        // Where to send the user after login (saved by /auth/login)
        const returnTo = cookies.get('auth_return_to') || '/';
        cookies.delete('auth_return_to', { path: '/' });

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

                if (!tokens?.access_token) {
                        return new Response('Failed to obtain access token', { status: 500 });
                }

                // Create authenticated client
                const authenticatedClient = createAuthenticatedClient(tokens.access_token, tokens.refresh_token);

                // Get user GUID
                let userGuid = null;
                try {
                        const userInfo = await authenticatedClient.user.games();
                        userGuid = userInfo?.guid || null;
                        console.log('[OAuth] User GUID:', userGuid);
                } catch (err) {
                        console.error('[OAuth] Error fetching user info:', err.message);
                }

                // Get manager info
                let managerInfo = null;
                if (userGuid && leagueID) {
                        try {
                                const users = await getYahooLeagueUsers(leagueID, authenticatedClient);
                                managerInfo = users.find(u =>
                                        u.user_id === userGuid || u.metadata?.yahoo_guid === userGuid
                                ) || null;
                        } catch (err) {
                                console.error('[OAuth] Error fetching league users:', err.message);
                        }
                }

                // Create session and set cookie
                const tokenData = {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        token_time: Date.now(),
                        expires_in: tokens.expires_in || 3600
                };

                const sessionId = createSession(userGuid, tokenData, managerInfo);

                cookies.set('session_id', sessionId, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 7 * 24 * 60 * 60
                });

                // If the configured league key isn't valid, send the user to the league picker first
                const selectedKey = cookies.get('selected_league_key');
                const effectiveLeagueKey = selectedKey || leagueID;
                const destination = isValidLeagueKey(effectiveLeagueKey) ? returnTo : '/auth/select-league';

                throw redirect(302, destination);
        } catch (error) {
                if (error.status === 302) throw error;
                console.error('[OAuth] Error:', error);
                return new Response(`Authentication failed: ${error.message}`, { status: 500 });
        }
}
