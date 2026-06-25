import { requireAuth } from '$lib/server/authGuard.js';
import { getArchiveTeamNames, getHeadToHead } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const teamNames = await getArchiveTeamNames();
	const teamA = url.searchParams.get('team_a') || teamNames[0] || null;
	const teamB = url.searchParams.get('team_b') || teamNames[1] || null;

	const h2h = teamA && teamB && teamA !== teamB ? await getHeadToHead(teamA, teamB) : null;

	return { teamNames, teamA, teamB, h2h };
}
