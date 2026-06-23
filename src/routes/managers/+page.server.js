import { loadLeagueUsers, loadLeagueRosters } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { managers } from '$lib/utils/leagueInfo';

export async function load({ url, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;
	const [users, rostersResult] = await waitForAll(
		loadLeagueUsers(yahooClient, leagueKey),
		loadLeagueRosters(yahooClient, leagueKey),
	);

	return {
		managers,
		leagueTeamManagersData: toMap(users),
		rosters: rostersResult?.rosters ?? null
	};
}

function toMap(rawUsers) {
	const out = {};
	for (const user of rawUsers || []) out[user.user_id] = user;
	return out;
}
