import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { loadPlayers } from '$lib/utils/helperFunctions/universalFunctions';

export async function load({ fetch, locals }) {
	const yahooClient = locals.yahooClient;
	
	const rostersInfo = waitForAll(
		loadLeagueData(yahooClient),
		loadLeagueRosters(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
		loadPlayers(fetch),
	);

	return {
		rostersInfo
	};
}

async function loadLeagueUsersWithManagers(yahooClient) {
	const users = await loadLeagueUsers(yahooClient);
	return processUsers(users);
}

function processUsers(rawUsers) {
	const processedUsers = {};
	for(const user of rawUsers) {
		processedUsers[user.user_id] = user;
	}
	return processedUsers;
}
