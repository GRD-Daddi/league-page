import { redirect } from '@sveltejs/kit';
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
                
                if (!appKey || !appSecret) {
                        return new Response('Yahoo API credentials not configured', { status: 500 });
                }
                
                const redirectUri = process.env.VITE_YAHOO_REDIRECT_URI || 
                                                        import.meta.env.VITE_YAHOO_REDIRECT_URI || 
                                                        `${url.origin}/auth/yahoo/callback`;
                
                // Manually exchange auth code for tokens
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
                        console.error('Yahoo OAuth token exchange failed:', errorText);
                        return new Response(`Failed to obtain access token: ${errorText}`, { status: 500 });
                }
                
                const tokens = await tokenResponse.json();
                
                console.log('[OAuth Callback] Token exchange successful:', {
                        hasAccessToken: !!tokens.access_token,
                        hasRefreshToken: !!tokens.refresh_token,
                        expiresIn: tokens.expires_in,
                        tokenType: tokens.token_type
                });
                
                if (!tokens || !tokens.access_token) {
                        return new Response('Failed to obtain access token', { status: 500 });
                }
                
                // SECURITY FIX: Create a temporary authenticated client instead of mutating the global singleton.
                // This prevents token leakage across different user sessions.
                const authenticatedClient = createAuthenticatedClient(
                        tokens.access_token,
                        tokens.refresh_token
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
                                const users = await getYahooLeagueUsers(leagueID, authenticatedClient);
                                managerInfo = users.find(u => u.user_id === userGuid || u.metadata?.yahoo_guid === userGuid);
                        } catch (err) {
                                console.error('Error fetching league users:', err);
                        }
                }
                
                // Store tokens with proper structure for session
                const tokenData = {
                        access_token: tokens.access_token,
                        refresh_token: tokens.refresh_token,
                        token_time: Date.now(),
                        expires_in: tokens.expires_in || 3600
                };
                
                const sessionId = createSession(userGuid, tokenData, managerInfo);
                
                console.log('[OAuth Callback] Created session:', sessionId.substring(0, 10) + '...');
                
                cookies.set('session_id', sessionId, {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 7 * 24 * 60 * 60
                });
                
                console.log('[OAuth Callback] Cookie set, redirecting to /');
                
                throw redirect(302, '/');
        } catch (error) {
                if (error.status === 302) {
                        throw error;
                }
                console.error('OAuth callback error:', error);
                return new Response(`Authentication failed: ${error.message}`, { status: 500 });
        }
}
