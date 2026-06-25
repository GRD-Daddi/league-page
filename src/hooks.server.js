import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { readSessionId, clearSessionCookie } from '$lib/server/sessionCookie.js';
import { getSession, updateSession, deleteSession } from '$lib/server/sessionStore.js';
import { createAuthenticatedClient } from '$lib/yahoo-adapter/yahooClient.js';
import { leagueID as configuredLeagueID } from '$lib/utils/leagueInfo.js';

function isTokenExpired(session) {
        if (!session?.tokens) return true;
        const { token_time = 0, expires_in = 3600 } = session.tokens;
        return Date.now() >= token_time + expires_in * 1000 - 5 * 60 * 1000;
}

// A single page load fans out into many concurrent server requests. Without
// coordination they would all see the expired token and all call Yahoo's refresh
// endpoint at once; Yahoo rotates the refresh token on first use, so every call
// after the first fails — which previously deleted a session that had in fact
// just been renewed. This in-process lock collapses concurrent refreshes for the
// same session into a single shared attempt.
const refreshLocks = new Map();

async function refreshSessionTokens(sessionId, session) {
        if (refreshLocks.has(sessionId)) return refreshLocks.get(sessionId);

        const attempt = (async () => {
                const refreshToken = session.tokens?.refresh_token;
                if (!refreshToken) return null;
                // The library's refreshToken(cb) is callback-style and reads the
                // refresh token off the client instance, so use an isolated client
                // (never the shared one) and promisify the callback. Passing the
                // token directly here crashes the process: the lib calls cb(null,
                // data) on what it thinks is a callback.
                const yf = createAuthenticatedClient(null, refreshToken);
                const newTokens = await new Promise((resolve, reject) => {
                        yf.refreshToken((err, data) => (err ? reject(err) : resolve(data)));
                });
                if (!newTokens?.access_token) return null;
                const updated = {
                        ...session,
                        tokens: {
                                ...session.tokens,
                                ...newTokens,
                                // Yahoo sometimes omits a fresh refresh_token on renewal;
                                // keep the existing one so the next refresh still works.
                                refresh_token: newTokens.refresh_token || session.tokens.refresh_token,
                                token_time: Date.now()
                        }
                };
                await updateSession(sessionId, updated);
                return updated;
        })().finally(() => refreshLocks.delete(sessionId));

        refreshLocks.set(sessionId, attempt);
        return attempt;
}

export async function handle({ event, resolve }) {
        const sessionId = readSessionId(event.cookies);
        let session = sessionId ? await getSession(sessionId) : null;

        async function endSession(reason) {
                if (sessionId) await deleteSession(sessionId);
                clearSessionCookie(event.cookies);
                session = null;
                if (!event.url.pathname.startsWith('/auth/')) {
                        redirect(302, `/auth/error?reason=${reason}`);
                }
        }

        if (session && isTokenExpired(session)) {
                let refreshed = null;
                try {
                        refreshed = await refreshSessionTokens(sessionId, session);
                } catch (error) {
                        console.error('[hooks] Token refresh failed:', error.message);
                }

                if (refreshed) {
                        session = refreshed;
                } else {
                        // Our refresh failed — but a concurrent request or another
                        // server instance may have already rotated the token. Re-read
                        // from the store and only log out if it is genuinely gone/stale.
                        const fresh = await getSession(sessionId);
                        if (fresh && !isTokenExpired(fresh)) {
                                session = fresh;
                        } else {
                                await endSession('token_refresh_failed');
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

        const response = await resolve(event);
        // In development the app is viewed through Replit's proxied preview iframe,
        // where the browser can hold onto stale HTML/modules across edits. Force the
        // browser to always revalidate so code changes show up on a normal refresh.
        if (dev) {
                response.headers.set('cache-control', 'no-store, max-age=0, must-revalidate');
        }
        return response;
}

export const handleFetch = async ({ request, fetch }) => {
        return fetch(request);
};
