import { requireAuth } from '$lib/server/authGuard.js';
import { getManagerSeasons, getManagerCareers } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const team = url?.searchParams?.get('team') ?? null;
	const [seasons, careers] = await Promise.all([getManagerSeasons(team), getManagerCareers()]);
	const career = careers.find((c) => c.teamName === team) ?? null;

	return { team, seasons, career };
}
