import { enableBlog } from '$lib/utils/leagueInfo';
import { loadLeagueUsers } from '$lib/server/dataLoaders.js';

export async function load({ params, fetch, locals }) {
	const yahooClient = locals.yahooClient;
	
	if(!enableBlog) return false;

	const slug = params?.slug;
	const leagueTeamManagersData = await loadLeagueUsersWithManagers(yahooClient);

	return {
		slug,
		postData: null,
		leagueTeamManagersData,
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
