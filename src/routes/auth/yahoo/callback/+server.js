import { redirect } from '@sveltejs/kit';
import { createAuthenticatedClient } from '$lib/yahoo-adapter/yahooClient.js';
import { setSessionCookie } from '$lib/server/sessionCookie.js';
import { getAuthConfig } from '$lib/server/authConfig.js';
import { getYahooLeagueUsers } from '$lib/yahoo-adapter/rosterAdapter.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

function isValidLeagueKey(key) {
	return typeof key === 'string' && /^\d+\.l\.\d+$/.test(key);
}

export async function GET({ url, cookies, fetch }) {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const storedState = cookies.get('oauth_state');

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
			console.log('[OAuth] User GUID:', userGuid);
		} catch (err) {
			console.error('[OAuth] Error fetching user info:', err.message);
		}

		let managerInfo = null;
		if (userGuid && leagueID) {
			try {
				const users = await getYahooLeagueUsers(leagueID, authenticatedClient);
				managerInfo =
					users.find(
						(u) => u.user_id === userGuid || u.metadata?.yahoo_guid === userGuid
					) || null;
			} catch (err) {
				console.error('[OAuth] Error fetching league users:', err.message);
			}
		}

		const sessionData = {
			userId: userGuid,
			tokens: {
				access_token: tokens.access_token,
				refresh_token: tokens.refresh_token,
				expires_in: tokens.expires_in || 3600,
				token_time: Date.now()
			},
			managerInfo,
			createdAt: Date.now()
		};

		setSessionCookie(cookies, sessionData);

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
