import crypto from 'crypto';
import { query } from './db.js';

const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Server-side session store backed by the `sessions` Postgres table.
 *
 * The browser only ever holds an opaque random session id (see sessionCookie.js).
 * All sensitive data (Yahoo tokens, manager info) lives here, so the cookie stays
 * tiny and token refreshes are persisted centrally — sessions survive both server
 * restarts and token renewals without logging the user out.
 */

function newSessionId() {
        return crypto.randomBytes(32).toString('base64url');
}

/**
 * Best-effort purge of expired rows. Fire-and-forget; never blocks the caller.
 */
function purgeExpired() {
        query('DELETE FROM sessions WHERE expires_at < now()').catch((err) => {
                console.error('[sessionStore] Failed to purge expired sessions:', err.message);
        });
}

/**
 * Creates a new session row and returns its id.
 */
export async function createSession(data) {
        const sessionId = newSessionId();
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
        await query(
                `INSERT INTO sessions (session_id, data, expires_at)
                 VALUES ($1, $2::jsonb, $3)`,
                [sessionId, JSON.stringify(data), expiresAt]
        );
        purgeExpired();
        return sessionId;
}

/**
 * Returns the session data for a given id, or null if missing/expired.
 * Expired rows are deleted as a side effect.
 */
export async function getSession(sessionId) {
        if (!sessionId) return null;
        const result = await query(
                `SELECT data, expires_at FROM sessions WHERE session_id = $1`,
                [sessionId]
        );
        const row = result.rows[0];
        if (!row) return null;

        if (new Date(row.expires_at).getTime() <= Date.now()) {
                await deleteSession(sessionId);
                return null;
        }

        return row.data;
}

/**
 * Replaces the stored data for an existing session and slides its expiry forward.
 */
export async function updateSession(sessionId, data) {
        if (!sessionId) return;
        const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
        await query(
                `UPDATE sessions
                 SET data = $2::jsonb, expires_at = $3, updated_at = now()
                 WHERE session_id = $1`,
                [sessionId, JSON.stringify(data), expiresAt]
        );
}

/**
 * Removes a session row.
 */
export async function deleteSession(sessionId) {
        if (!sessionId) return;
        await query(`DELETE FROM sessions WHERE session_id = $1`, [sessionId]);
}

export { SESSION_MAX_AGE_MS };
