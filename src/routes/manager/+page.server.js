import { requireAuth } from '$lib/server/authGuard.js';
import { getManagerSeasons, getManagerCareers } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const owner = url?.searchParams?.get('owner') ?? null;
	const [seasons, careers] = await Promise.all([getManagerSeasons(owner), getManagerCareers()]);
	const career = careers.find((c) => c.owner === owner) ?? null;

	return { owner, ownerName: career?.ownerName ?? owner, seasons, career };
}
