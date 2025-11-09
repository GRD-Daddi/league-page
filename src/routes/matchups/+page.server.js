import { loadMatchupData, loadBrackets, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { loadPlayers } from '$lib/utils/helperFunctions/universalFunctions';

export async function load({ url, fetch, locals }) {
        const yahooClient = locals.yahooClient;
        const queryWeek = url?.searchParams?.get('week');
        
        const [matchupsData, bracketsData, teamManagersData, playersData] = await waitForAll(
                loadMatchupData(yahooClient),
                loadBrackets(yahooClient),
                loadLeagueUsersWithManagers(yahooClient),
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
