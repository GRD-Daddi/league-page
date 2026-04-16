import { loadLeagueData, loadDraftResults, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { leagueID } from '$lib/utils/leagueInfo';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const yahooClient = locals.yahooClient;

	const [upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData] = await waitForAll(
		loadUpcomingDraft(yahooClient),
		loadPreviousDrafts(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
		loadPlayers(fetch),
	);

	return { upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData };
}

async function loadUpcomingDraft(yahooClient) {
	return await loadDraftResults(yahooClient, leagueID);
}

async function loadPreviousDrafts(yahooClient) {
	let currentLeagueID = leagueID;
	const drafts = [];

	while (currentLeagueID && currentLeagueID != 0) {
		const leagueData = await loadLeagueData(yahooClient, currentLeagueID);
		if (!leagueData) break;

		const draftResults = await loadDraftResults(yahooClient, currentLeagueID);
		if (draftResults && draftResults.length > 0) {
			drafts.push({ year: parseInt(leagueData.season), draft: draftResults });
		}

		currentLeagueID = leagueData.previous_league_id;
		if (!currentLeagueID) break;
	}

	return drafts;
}

async function loadLeagueUsersWithManagers(yahooClient) {
	const users = await loadLeagueUsers(yahooClient);
	return processUsers(users);
}

function processUsers(rawUsers) {
	const processedUsers = {};
	for (const user of rawUsers || []) {
		processedUsers[user.user_id] = user;
	}
	return processedUsers;
}
