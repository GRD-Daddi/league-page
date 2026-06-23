import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/sessionCookie.js';

export async function GET({ cookies }) {
	clearSessionCookie(cookies);
	throw redirect(302, '/');
}
