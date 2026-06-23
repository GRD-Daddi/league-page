import { redirect } from '@sveltejs/kit';
import { createAuthenticatedClient, withRetry } from '$lib/yahoo-adapter/yahooClient.js';
import { setSessionIdCookie } from '$lib/server/sessionCookie.js';
import { createSession } from '$lib/server/sessionStore.js';
import { getAuthConfig } from '$lib/server/authConfig.js';
import { getYahooLeagueUsers } from '$lib/yahoo-adapter/rosterAdapter.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

function isValidLeagueKey(key) {
        return typeof key === 'string' && /^\d+\.l\.\d+$/.test(key);
}

// Walks any nested Yahoo response and collects every team_key string found.
// Yahoo responses are deeply nested and shape-inconsistent, so we scan rather
// than rely on a fixed path.
function collectTeamKeys(node, out = []) {
        if (!node || typeof node !== 'object') return out;
        if (Array.isArray(node)) {
                for (const item of node) collectTeamKeys(item, out);
                return out;
        }
        for (const [key, value] of Object.entries(node)) {
                if (key === 'team_key' && typeof value === 'string') out.push(value);
                else collectTeamKeys(value, out);
        }
        return out;
}

// Returns the logged-in user's own team_key within the configured league, or
// null if they have no team there (i.e. they are not a league member). Yahoo
// masks manager GUIDs in league listings, so membership is verified from the
// user's OWN teams (which always carry their real team_key) rather than by
// matching GUIDs. Matching on the league number (".l.<num>.") is robust across
// Yahoo's numeric game-id prefixes.
async function findUsersTeamInLeague(client, configuredLeagueId) {
        const match = String(configuredLeagueId || '').match(/\.l\.(\d+)/);
        const leagueNum = match ? match[1] : null;
        if (!leagueNum || typeof client?.user?.game_teams !== 'function') return null;

        let data;
        try {
                // Retry transient Yahoo failures so a real member is not wrongly
                // denied access (the gate is otherwise fail-closed).
                data = await withRetry(() => client.user.game_teams(['nfl']));
        } catch (err) {
                console.error('[OAuth] Error fetching user teams:', err.message);
                return null;
        }

        const needle = `.l.${leagueNum}.`;
        return collectTeamKeys(data).find((tk) => tk.includes(needle)) || null;
}

export async function GET({ url, cookies, fetch }) {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const storedState = cookies.get('oauth_state');

        console.log('[OAuth] callback received at', new Date().toISOString(), '— hasCode:', !!code, 'hasState:', !!state);

        if (!code) {
                throw redirect(302, '/auth/error?reason=no_code');
        }

        if (!state || state !== storedState) {
                throw redirect(302, '/auth/error?reason=invalid_state');
        }

        cookies.delete('oauth_state', { path: '/' });

        const returnTo = cookies.get('auth_return_to') || '/';
        cookies.delete('auth_return_to', { path: '/' });

        try {
                const { appKey, appSecret, redirectUri } = getAuthConfig(url.origin);

                if (!appKey || !appSecret) {
                        throw redirect(302, '/auth/error?reason=credentials_missing');
                }

                const authHeader = Buffer.from(`${appKey}:${appSecret}`, 'binary').toString('base64');
                const tokenParams = new URLSearchParams({
                        client_id: appKey,
                        client_secret: appSecret,
                        redirect_uri: redirectUri,
                        code,
                        grant_type: 'authorization_code'
                });

                const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
                        method: 'POST',
                        headers: {
                                Authorization: `Basic ${authHeader}`,
                                'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: tokenParams.toString()
                });

                if (!tokenResponse.ok) {
                        const errorText = await tokenResponse.text();
                        console.error('[OAuth] Token exchange failed:', errorText);
                        throw redirect(302, '/auth/error?reason=token_exchange_failed');
                }

                const tokens = await tokenResponse.json();

                if (!tokens?.access_token) {
                        throw redirect(302, '/auth/error?reason=no_access_token');
                }

                const authenticatedClient = createAuthenticatedClient(tokens.access_token, tokens.refresh_token);

                let userGuid = null;
                try {
                        const userInfo = await authenticatedClient.user.games();
                        userGuid = userInfo?.guid || null;
                } catch (err) {
                        console.error('[OAuth] Error fetching user info:', err.message);
                }

                // Membership gate: only people who own a team in THIS league may sign in.
                const usersTeamKey = await findUsersTeamInLeague(authenticatedClient, leagueID);
                if (!usersTeamKey) {
                        console.warn('[OAuth] Login denied — Yahoo account has no team in league', leagueID);
                        throw redirect(302, '/auth/error?reason=not_league_member');
                }

                // Resolve "their" team's display info. Match on team_key (GUIDs are hidden).
                let managerInfo = { team_key: usersTeamKey };
                try {
                        const users = await getYahooLeagueUsers(leagueID, authenticatedClient);
                        const matched = users.find((u) => u.metadata?.team_key === usersTeamKey);
                        if (matched) managerInfo = matched;
                } catch (err) {
                        console.error('[OAuth] Error fetching league users:', err.message);
                }

                const sessionData = {
                        userId: userGuid || usersTeamKey,
                        tokens: {
                                access_token: tokens.access_token,
                                refresh_token: tokens.refresh_token,
                                expires_in: tokens.expires_in || 3600,
                                token_time: Date.now()
                        },
                        managerInfo,
                        createdAt: Date.now()
                };

                const sessionId = await createSession(sessionData);
                setSessionIdCookie(cookies, sessionId);

                const selectedKey = cookies.get('selected_league_key');
                const effectiveLeagueKey = selectedKey || leagueID;
                const destination = isValidLeagueKey(effectiveLeagueKey) ? returnTo : '/auth/select-league';

                throw redirect(302, destination);
        } catch (error) {
                if (error.status === 302) throw error;
                console.error('[OAuth] Unexpected error:', error);
                throw redirect(302, '/auth/error?reason=unexpected');
        }
}
