import { loadLeagueData, loadLeagueRosters, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { managers as managersObj } from '$lib/utils/leagueInfo';

export async function load({ url, locals, fetch }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;
	const roster = url?.searchParams?.get('roster');
	const team = url?.searchParams?.get('team');

	const managersInfo = waitForAll(
		loadLeagueRosters(yahooClient, leagueKey),
		loadLeagueUsersAsMap(yahooClient, leagueKey),
		loadLeagueData(yahooClient, leagueKey),
		loadPlayers(fetch).catch(() => ({ players: {} })),
	);

	return {
		roster,
		team,
		managers: managersObj,
		managersInfo
	};
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
