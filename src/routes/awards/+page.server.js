import { requireAuth } from '$lib/server/authGuard.js';
import { getTrophyRoom, getChampionshipCounts } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	const [trophyRoom, titleCounts] = await Promise.all([getTrophyRoom(), getChampionshipCounts()]);
	return { trophyRoom, titleCounts };
}
