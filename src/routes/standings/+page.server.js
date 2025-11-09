import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { leagueID } from '$lib/utils/leagueInfo';

export async function load({ locals }) {
	const yahooClient = locals.yahooClient;
	
	const [standingsData, leagueTeamManagersData] = await waitForAll(
		loadStandingsData(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
	);

	return {
		standingsData,
		leagueTeamManagersData,
	};
}

async function loadStandingsData(yahooClient) {
	const [rosters, leagueData] = await waitForAll(
		loadLeagueRosters(yahooClient),
		loadLeagueData(yahooClient),
	);
	
	return { rosters: rosters.rosters, leagueData };
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
