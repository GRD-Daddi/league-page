import { loadLeagueData, loadLeagueUsers, loadLeagueTransactions, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const yahooClient = locals.yahooClient;
	const show = url?.searchParams?.get('show');
	const query = url?.searchParams?.get('query');
	const curPage = url?.searchParams?.get('page');

	const [transactionsData, leagueTeamManagersData, playersData] = await waitForAll(
		loadAllTransactions(yahooClient),
		loadLeagueUsersWithManagers(yahooClient),
		loadPlayers(fetch),
	);

	const bannedValues = ['undefined'];

	const props = {
		show: 'both',
		query: '',
		playersData,
		transactionsData,
		leagueTeamManagersData,
		page: 0,
	};

	if (show && (show == 'trade' || show == 'waiver' || show == 'both')) {
		props.show = show;
	}
	if (query && !bannedValues.includes(query)) {
		props.query = query;
	}
	if (curPage && !isNaN(curPage)) {
		props.page = parseInt(curPage) - 1;
	}

	return props;
}

async function loadAllTransactions(yahooClient) {
	const leagueData = await loadLeagueData(yahooClient);
	if (!leagueData) return [];

	const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
	const transactionPromises = [];
	for (let i = 1; i <= regularSeasonLength + 2; i++) {
		transactionPromises.push(loadLeagueTransactions(yahooClient, undefined, i));
	}

	const transactionWeeks = await waitForAll(...transactionPromises);
	return transactionWeeks.flat();
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
