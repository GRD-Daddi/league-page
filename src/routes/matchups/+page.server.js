import { loadMatchupData, loadBrackets, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;
	const queryWeek = url?.searchParams?.get('week');

	const [matchupsData, bracketsData, teamManagersData, playersData] = await waitForAll(
		loadMatchupData(yahooClient, leagueKey),
		loadBrackets(yahooClient, leagueKey),
		loadLeagueUsersAsMap(yahooClient, leagueKey),
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

async function loadLeagueUsersAsMap(yahooClient, leagueKey) {
	const users = await loadLeagueUsers(yahooClient, leagueKey);
	return toMap(users);
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}
