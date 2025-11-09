import { loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { managers } from '$lib/utils/leagueInfo';

export async function load({ locals }) {
	const yahooClient = locals.yahooClient;
	
	if(!managers.length) return {managers};
	
	const leagueTeamManagersData = await loadLeagueUsersWithManagers(yahooClient);

	return {
		managers,
		leagueTeamManagersData
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
