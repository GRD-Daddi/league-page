import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { managers as managersObj } from '$lib/utils/leagueInfo';

export async function load({ url, locals }) {
	requireAuth(locals, url);
	if (!managersObj.length) return false;

	const { yahooClient, leagueKey } = locals;
	const manager = url?.searchParams?.get('manager');

	const managersInfo = waitForAll(
		loadLeagueRosters(yahooClient, leagueKey),
		loadLeagueUsersAsMap(yahooClient, leagueKey),
		loadLeagueData(yahooClient, leagueKey),
	);

	return {
		manager: manager && manager < managersObj.length ? manager : -1,
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
