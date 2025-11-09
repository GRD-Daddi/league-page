import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { managers as managersObj } from '$lib/utils/leagueInfo';

export async function load({ url, locals }) {
	const yahooClient = locals.yahooClient;
	
	if(!managersObj.length) return false;
	
	const managersInfo = waitForAll(
		loadLeagueRosters(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
		loadLeagueData(yahooClient),
	);

	const manager = url?.searchParams?.get('manager');

	return {
		manager: manager && manager < managersObj.length ? manager : -1,
		managers: managersObj,
		managersInfo
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
