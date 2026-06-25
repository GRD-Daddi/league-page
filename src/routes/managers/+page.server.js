import { requireAuth } from '$lib/server/authGuard.js';
import { getManagerCareers } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	const careers = await getManagerCareers();
	return { careers };
}
