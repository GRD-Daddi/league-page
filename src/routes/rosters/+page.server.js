import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const yahooClient = locals.yahooClient;

	const rostersInfo = waitForAll(
		loadLeagueData(yahooClient),
		loadLeagueRosters(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
		loadPlayers(fetch),
	);

	return { rostersInfo };
}

async function loadLeagueUsersWithManagers(yahooClient) {
	const users = await loadLeagueUsers(yahooClient);
	return processUsers(users);
}

function processUsers(rawUsers) {
	const processedUsers = {};
	for (const user of rawUsers || []) {
		processedUsers[user.user_id] = user;
	}
	return processedUsers;
}
