import { loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';

export async function load({url, fetch, locals}) {
        const yahooClient = locals.yahooClient;
        
        const playerOne = url?.searchParams?.get('player_one');
        const playerTwo = url?.searchParams?.get('player_two');

        return {
                leagueTeamManagerData: await loadLeagueUsersWithManagers(yahooClient),
                playersData: await loadPlayers(fetch),
                transactionsData: null,
                recordsData: null,
                playerOne,
                playerTwo,
        };
}

async function loadLeagueUsersWithManagers(yahooClient) {
        const users = await loadLeagueUsers(yahooClient);
        return processUsers(users);
}

function processUsers(rawUsers) {
        const processedUsers = {};
        for(const user of rawUsers) {
                processedUsers[user.user_id] = user;
        }
        return processedUsers;
}
