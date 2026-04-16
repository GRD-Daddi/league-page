import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	const { yahooClient, leagueKey } = locals;
	const users = await loadLeagueUsers(yahooClient, leagueKey);
	return { leagueTeamManagersData: toMap(users) };
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}
