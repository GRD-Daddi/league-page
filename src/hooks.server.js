import { getSession, updateSession, isTokenExpired, deleteSession } from '$lib/server/sessionStore.js';
import { createAuthenticatedClient, getYahooClient } from '$lib/yahoo-adapter/yahooClient.js';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		const session = getSession(sessionId);

		if (session) {
			if (isTokenExpired(session)) {
				try {
					const yf = getYahooClient();
					if (yf && session.tokens.refresh_token) {
						const newTokens = await yf.refreshToken(session.tokens.refresh_token);

						if (newTokens?.access_token) {
							const updatedTokens = { ...newTokens, token_time: Date.now() };
							updateSession(sessionId, { tokens: updatedTokens });
							session.tokens = updatedTokens;
						} else {
							deleteSession(sessionId);
							event.cookies.delete('session_id', { path: '/' });
							return resolve(event);
						}
					}
				} catch (error) {
					console.error('[hooks] Token refresh failed:', error.message);
					deleteSession(sessionId);
					event.cookies.delete('session_id', { path: '/' });
					return resolve(event);
				}
			}

			event.locals.session = session;
			event.locals.yahooClient = createAuthenticatedClient(
				session.tokens.access_token,
				session.tokens.refresh_token
			);
		}
	}

	return resolve(event);
}

export const handleFetch = async ({ request, fetch }) => {
	return fetch(request);
};
