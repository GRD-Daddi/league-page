import { requireAuth } from '$lib/server/authGuard.js';
import { getAllTimeRecords, getChampionshipCounts, getManagerCareers } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	const [records, titleCounts, careers] = await Promise.all([
		getAllTimeRecords(),
		getChampionshipCounts(),
		getManagerCareers()
	]);
	return { records, titleCounts, careers };
}
