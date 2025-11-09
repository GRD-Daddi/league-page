import { loadLeagueUsers } from '$lib/server/dataLoaders.js';

export async function load({ locals }) {
	const yahooClient = locals.yahooClient;
	
	const teamManagersData = await loadLeagueUsersWithManagers(yahooClient);

	return {
		awardsData: null,
		teamManagersData,
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
