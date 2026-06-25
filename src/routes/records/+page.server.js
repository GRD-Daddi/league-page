import { requireAuth } from '$lib/server/authGuard.js';
import { getAllTimeRecords, getChampionshipCounts, getManagerCareers, getSeasonPodiums } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
        requireAuth(locals, url);
        const [records, titleCounts, careers, podiums] = await Promise.all([
                getAllTimeRecords(),
                getChampionshipCounts(),
                getManagerCareers(),
                getSeasonPodiums()
        ]);
        return { records, titleCounts, careers, podiums };
}
