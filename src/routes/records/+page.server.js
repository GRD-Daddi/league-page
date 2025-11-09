import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ locals }) {
	const yahooClient = locals.yahooClient;
	
	const recordsInfo = waitForAll(
		loadLeagueUsersWithManagers(yahooClient),
	);

	return {
		recordsInfo
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
