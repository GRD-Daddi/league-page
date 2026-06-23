import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, readSessionId } from '$lib/server/sessionCookie.js';
import { deleteSession } from '$lib/server/sessionStore.js';

export async function GET({ cookies }) {
        const sessionId = readSessionId(cookies);
        if (sessionId) {
                try {
                        await deleteSession(sessionId);
                } catch (err) {
                        console.error('[logout] Failed to delete session:', err.message);
                }
        }
        clearSessionCookie(cookies);
        throw redirect(302, '/');
}
