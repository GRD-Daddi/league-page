import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const yahooClient = locals.yahooClient;
	const users = await loadLeagueUsers(yahooClient);
	const leagueTeamManagersData = processUsers(users);

	return { awardsData: null, leagueTeamManagersData };
}

function processUsers(rawUsers) {
	const processedUsers = {};
	for (const user of rawUsers || []) {
		processedUsers[user.user_id] = user;
	}
	return processedUsers;
}
