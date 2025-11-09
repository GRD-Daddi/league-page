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
                                                
                                                if (newTokens && newTokens.access_token) {
                                                        updateSession(sessionId, {
                                                                tokens: {
                                                                        ...newTokens,
                                                                        token_time: Date.now()
                                                                }
                                                        });
                                                        
                                                        session.tokens = {
                                                                ...newTokens,
                                                                token_time: Date.now()
                                                        };
                                                } else {
                                                        // Token refresh failed - delete session and force re-authentication
                                                        deleteSession(sessionId);
                                                        event.cookies.delete('session_id', { path: '/' });
                                                        event.locals.session = null;
                                                        event.locals.yahooClient = null;
                                                }
                                        }
                                } catch (error) {
                                        console.error('Error refreshing token:', error);
                                        // On token refresh failure, delete the session and clear the cookie to force re-authentication
                                        deleteSession(sessionId);
                                        event.cookies.delete('session_id', { path: '/' });
                                        event.locals.session = null;
                                        event.locals.yahooClient = null;
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
