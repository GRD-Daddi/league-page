import { readSessionCookie, setSessionCookie, clearSessionCookie } from '$lib/server/sessionCookie.js';
import { createAuthenticatedClient, getYahooClient } from '$lib/yahoo-adapter/yahooClient.js';
import { leagueID as configuredLeagueID } from '$lib/utils/leagueInfo.js';

function isTokenExpired(session) {
	if (!session?.tokens) return true;
	const { token_time = 0, expires_in = 3600 } = session.tokens;
	return Date.now() >= token_time + expires_in * 1000 - 5 * 60 * 1000;
}

export async function handle({ event, resolve }) {
	let session = readSessionCookie(event.cookies);

	if (session) {
		if (isTokenExpired(session)) {
			try {
				const yf = getYahooClient();
				if (yf && session.tokens?.refresh_token) {
					const newTokens = await yf.refreshToken(session.tokens.refresh_token);
					if (newTokens?.access_token) {
						session = {
							...session,
							tokens: { ...newTokens, token_time: Date.now() }
						};
						setSessionCookie(event.cookies, session);
					} else {
						clearSessionCookie(event.cookies);
						session = null;
					}
				} else {
					clearSessionCookie(event.cookies);
					session = null;
				}
			} catch (error) {
				console.error('[hooks] Token refresh failed:', error.message);
				clearSessionCookie(event.cookies);
				session = null;
			}
		}
	}

	if (session) {
		event.locals.session = session;
		event.locals.yahooClient = createAuthenticatedClient(
			session.tokens.access_token,
			session.tokens.refresh_token
		);
	}

	const cookieLeagueKey = event.cookies.get('selected_league_key');
	event.locals.leagueKey = cookieLeagueKey || configuredLeagueID;

	return resolve(event);
}

export const handleFetch = async ({ request, fetch }) => {
	return fetch(request);
};
