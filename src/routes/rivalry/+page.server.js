import { loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;
	const playerOne = url?.searchParams?.get('player_one');
	const playerTwo = url?.searchParams?.get('player_two');

	const users = await loadLeagueUsers(yahooClient, leagueKey);

	return {
		leagueTeamManagerData: toMap(users),
		playersData: await loadPlayers(fetch),
		transactionsData: null,
		recordsData: null,
		playerOne,
		playerTwo,
	};
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}
