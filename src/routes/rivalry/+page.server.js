import { loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const yahooClient = locals.yahooClient;
	const playerOne = url?.searchParams?.get('player_one');
	const playerTwo = url?.searchParams?.get('player_two');

	const users = await loadLeagueUsers(yahooClient);

	return {
		leagueTeamManagerData: processUsers(users),
		playersData: await loadPlayers(fetch),
		transactionsData: null,
		recordsData: null,
		playerOne,
		playerTwo,
	};
}

function processUsers(rawUsers) {
	const processedUsers = {};
	for (const user of rawUsers || []) {
		processedUsers[user.user_id] = user;
	}
	return processedUsers;
}
