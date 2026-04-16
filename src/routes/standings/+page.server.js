import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;

	const [standingsData, leagueTeamManagersData] = await waitForAll(
		loadStandingsData(yahooClient, leagueKey),
		loadLeagueUsersAsMap(yahooClient, leagueKey),
	);

	return { standingsData, leagueTeamManagersData };
}

async function loadStandingsData(yahooClient, leagueKey) {
	const [rosters, leagueData] = await waitForAll(
		loadLeagueRosters(yahooClient, leagueKey),
		loadLeagueData(yahooClient, leagueKey),
	);
	return { rosters: rosters?.rosters, leagueData };
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
