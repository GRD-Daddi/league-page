import { leagueID as configuredLeagueID } from '$lib/utils/leagueInfo.js';
import { 
        getLeagueData as getLeagueDataApi,
        getLeagueRosters as getLeagueRostersApi,
        getLeagueUsers as getLeagueUsersApi,
        getLeagueMatchups as getLeagueMatchupsApi,
        getNFLState as getNFLStateApi,
        getLeagueTransactions as getLeagueTransactionsApi,
        getDraftResults as getDraftResultsApi,
        getWinnersBracket,
        getLosersBracket
} from '$lib/utils/platformApi.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise.js';
import { loadPlayers as loadPlayersUtil } from '$lib/utils/helperFunctions/players.js';

export async function loadLeagueData(yahooClient = null, queryLeagueID = configuredLeagueID) {
        return await getLeagueDataApi(queryLeagueID, yahooClient);
}

export async function loadLeagueRosters(yahooClient = null, queryLeagueID = configuredLeagueID) {
        const rosters = await getLeagueRostersApi(queryLeagueID, yahooClient);
        return processRosters(rosters);
}

export async function loadLeagueUsers(yahooClient = null, queryLeagueID = configuredLeagueID) {
        return await getLeagueUsersApi(queryLeagueID, yahooClient);
}

export async function loadLeagueMatchups(yahooClient = null, queryLeagueID = configuredLeagueID, week) {
        return await getLeagueMatchupsApi(queryLeagueID, week, yahooClient);
}

export async function loadNFLState(yahooClient = null) {
        return await getNFLStateApi(yahooClient);
}

export async function loadLeagueTransactions(yahooClient = null, queryLeagueID = configuredLeagueID, week) {
        return await getLeagueTransactionsApi(queryLeagueID, week, yahooClient);
}

export async function loadDraftResults(yahooClient = null, leagueKeyOrDraftID, isLeagueKey = null) {
        return await getDraftResultsApi(leagueKeyOrDraftID, isLeagueKey, yahooClient);
}

export async function loadMatchupData(yahooClient = null, queryLeagueID = configuredLeagueID) {
        const [nflState, leagueData] = await waitForAll(
                getNFLStateApi(yahooClient),
                getLeagueDataApi(queryLeagueID, yahooClient),
        );

        if (!leagueData || !nflState) {
                return {
                        matchupWeeks: [],
                        year: null,
                        week: 1,
                        regularSeasonLength: 0,
                        requiresAuth: true
                };
        }

        let week = 1;
        if(nflState.season_type == 'regular') {
                week = nflState.display_week;
        } else if(nflState.season_type == 'post') {
                week = 18;
        }
        const year = leagueData.season;
        const regularSeasonLength = leagueData.settings.playoff_week_start - 1;

        const matchupsPromises = [];
        for(let i = 1; i < leagueData.settings.playoff_week_start; i++) {
                matchupsPromises.push(getLeagueMatchupsApi(queryLeagueID, i, yahooClient))
        }
        const matchupsData = await waitForAll(...matchupsPromises);

        const matchupWeeks = [];
        for(let i = 1; i < matchupsData.length + 1; i++) {
                const processed = processMatchups(matchupsData[i - 1], i);
                if(processed) {
                        matchupWeeks.push({
                                matchups: processed.matchups,
                                week: processed.week
                        });
                }
        }

        return {
                matchupWeeks,
                year,
                week,
                regularSeasonLength
        };
}

export async function loadBrackets(yahooClient = null, queryLeagueID = configuredLeagueID) {
        const [rosterRes, leagueData] = await waitForAll(
                loadLeagueRosters(yahooClient, queryLeagueID),
                getLeagueDataApi(queryLeagueID, yahooClient),
        );

        const numRosters = Object.keys(rosterRes.rosters).length;

        const bracketsAndMatchupFetches = [
                getWinnersBracket(queryLeagueID, yahooClient),
                getLosersBracket(queryLeagueID, yahooClient),
        ];

        const year = parseInt(leagueData.season);
        const playoffsStart = parseInt(leagueData.settings.playoff_week_start);
        
        let playoffType = 0;
        if(year > 2019) {
                playoffType = parseInt(leagueData.settings.playoff_round_type);
        }
        if(year == 2020 && playoffType == 1) {
                playoffType++;
        }

        for(let i = playoffsStart; i < 19; i++) {
                bracketsAndMatchupFetches.push(getLeagueMatchupsApi(queryLeagueID, i, yahooClient));
        }
        
        const playoffMatchups = await waitForAll(...bracketsAndMatchupFetches);
        const winnersData = playoffMatchups.shift();
        const losersData = playoffMatchups.shift();

        return { winnersData, losersData, playoffMatchups, numRosters, year, playoffType, playoffsStart };
}

function processMatchups(matchupsData, week) {
        if(!matchupsData || matchupsData.length === 0) return null;
        
        const matchups = {};
        for(const matchup of matchupsData) {
                if(!matchup.matchup_id) continue;
                if(!matchups[matchup.matchup_id]) {
                        matchups[matchup.matchup_id] = [];
                }
                matchups[matchup.matchup_id].push(matchup);
        }
        
        return { matchups: Object.values(matchups), week };
}

function processRosters(rosters) {
        const startersAndReserve = [];
        const rosterMap = {};
        for(const roster of rosters) {
                for(const starter of roster.starters) {
                        startersAndReserve.push(starter);
                }
                if(roster.reserve) {
                        for(const ir of roster.reserve) {
                                startersAndReserve.push(ir);
                        }
                }
                rosterMap[roster.roster_id] = roster;
        }
        return {rosters: rosterMap, startersAndReserve};
}

export async function loadPlayers(fetch) {
        return await loadPlayersUtil(fetch);
}
