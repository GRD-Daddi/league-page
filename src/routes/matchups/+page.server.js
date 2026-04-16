import { loadMatchupData, loadBrackets, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const yahooClient = locals.yahooClient;
	const queryWeek = url?.searchParams?.get('week');

	const [matchupsData, bracketsData, teamManagersData, playersData] = await waitForAll(
		loadMatchupData(yahooClient),
		loadBrackets(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
		loadPlayers(fetch),
	);

	return {
		queryWeek: isNaN(queryWeek) ? null : queryWeek,
		matchupsData,
		bracketsData,
		leagueTeamManagersData: teamManagersData,
		playersData
	};
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
