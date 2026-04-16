import { loadLeagueData, loadLeagueUsers, loadLeagueTransactions, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
	requireAuth(locals, url);

	const { yahooClient, leagueKey } = locals;
	const show = url?.searchParams?.get('show');
	const query = url?.searchParams?.get('query');
	const curPage = url?.searchParams?.get('page');

	const [transactionsData, leagueTeamManagersData, playersData] = await waitForAll(
		loadAllTransactions(yahooClient, leagueKey),
		loadLeagueUsersAsMap(yahooClient, leagueKey),
		loadPlayers(fetch),
	);

	const props = {
		show: 'both',
		query: '',
		playersData,
		transactionsData,
		leagueTeamManagersData,
		page: 0,
	};

	if (show && (show === 'trade' || show === 'waiver' || show === 'both')) props.show = show;
	if (query && query !== 'undefined') props.query = query;
	if (curPage && !isNaN(curPage)) props.page = parseInt(curPage) - 1;

	return props;
}

async function loadAllTransactions(yahooClient, leagueKey) {
	const leagueData = await loadLeagueData(yahooClient, leagueKey);
	if (!leagueData) return [];

	const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
	const transactionPromises = [];
	for (let i = 1; i <= regularSeasonLength + 2; i++) {
		transactionPromises.push(loadLeagueTransactions(yahooClient, leagueKey, i));
	}

	const transactionWeeks = await waitForAll(...transactionPromises);
	return transactionWeeks.flat();
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
