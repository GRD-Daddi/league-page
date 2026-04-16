import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { managers } from '$lib/utils/leagueInfo';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	if (!managers.length) return { managers };

	const { yahooClient, leagueKey } = locals;
	const users = await loadLeagueUsers(yahooClient, leagueKey);
	return { managers, leagueTeamManagersData: toMap(users) };
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}
