import { getSession, updateSession, isTokenExpired } from '$lib/server/sessionStore.js';
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
                                                }
                                        }
                                } catch (error) {
                                        console.error('Error refreshing token:', error);
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
