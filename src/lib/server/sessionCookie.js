const COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Cookie helpers for the server-side session store.
 *
 * The cookie holds ONLY an opaque session id (a random token generated in
 * sessionStore.js). All session data lives server-side in Postgres, so nothing
 * sensitive is ever written to the browser.
 */

export function setSessionIdCookie(cookies, sessionId) {
        cookies.set(COOKIE_NAME, sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: SESSION_MAX_AGE
        });
}

export function readSessionId(cookies) {
        return cookies.get(COOKIE_NAME) || null;
}

export function clearSessionCookie(cookies) {
        cookies.delete(COOKIE_NAME, { path: '/' });
}

export { COOKIE_NAME };
