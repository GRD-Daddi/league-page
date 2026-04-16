import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;

	const rostersInfo = waitForAll(
		loadLeagueData(yahooClient, leagueKey),
		loadLeagueRosters(yahooClient, leagueKey),
		loadLeagueUsersAsMap(yahooClient, leagueKey),
		loadPlayers(fetch),
	);

	return { rostersInfo };
}

async function loadLeagueUsersAsMap(yahooClient, leagueKey) {
	const users = await loadLeagueUsers(yahooClient, leagueKey);
	return toMap(users);
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}
