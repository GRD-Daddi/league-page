import { requireAuth } from '$lib/server/authGuard.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	return {};
}
