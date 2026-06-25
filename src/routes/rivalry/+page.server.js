import { requireAuth } from '$lib/server/authGuard.js';
import { getArchiveTeamNames, getHeadToHead } from '$lib/server/archiveStats.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const teamNames = await getArchiveTeamNames();

	// Default the first team to the logged-in user's own team when it appears in
	// the archive (team identity is by name); otherwise fall back to the first.
	const myTeam = locals.session?.managerInfo?.metadata?.team_name || null;
	const defaultA = myTeam && teamNames.includes(myTeam) ? myTeam : teamNames[0] || null;

	const teamA = url.searchParams.get('team_a') || defaultA;
	const teamB = url.searchParams.get('team_b') || teamNames.find((n) => n !== teamA) || null;

	const h2h = teamA && teamB && teamA !== teamB ? await getHeadToHead(teamA, teamB) : null;

	return { teamNames, teamA, teamB, h2h };
}
