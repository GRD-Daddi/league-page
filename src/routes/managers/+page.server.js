import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { managers } from '$lib/utils/leagueInfo';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	if (!managers.length) return { managers };

	const yahooClient = locals.yahooClient;
	const users = await loadLeagueUsers(yahooClient);

	return {
		managers,
		leagueTeamManagersData: processUsers(users),
	};
}

function processUsers(rawUsers) {
	const processedUsers = {};
	for (const user of rawUsers || []) {
		processedUsers[user.user_id] = user;
	}
	return processedUsers;
}
