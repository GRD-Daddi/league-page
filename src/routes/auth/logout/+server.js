import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/sessionStore.js';

export async function GET({ cookies }) {
        const sessionId = cookies.get('session_id');
        
        if (sessionId) {
                deleteSession(sessionId);
        }
        
        cookies.delete('session_id', { path: '/' });
        
        throw redirect(302, '/');
}
