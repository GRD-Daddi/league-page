import { enableBlog } from '$lib/utils/leagueInfo';
import { loadLeagueUsers } from '$lib/server/dataLoaders.js';

export async function load({ url, fetch, locals }) {
	const yahooClient = locals.yahooClient;
	
	if(!enableBlog) return false;

	const queryPage = url?.searchParams?.get('page') || 1;
	const filterKey = url?.searchParams?.get('filter') || '';
	const leagueTeamManagersData = await loadLeagueUsersWithManagers(yahooClient);

	return {
		queryPage,
		postsData: null,
		filterKey,
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
