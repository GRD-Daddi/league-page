import {
        getLeagueData,
        getLeagueRosters,
        getLeagueUsers,
        getLeagueMatchups,
        getNFLState,
        getLeagueTransactions,
        getDraftResults,
        getDraftData,
        getTradedPicks,
        getWinnersBracket,
        getLosersBracket,
        getAllPlayers,
        getPlayerStats,
        isYahooPlatform,
        getPlatform
} from '$lib/utils/platformApi.js';
import { leagueID } from '$lib/utils/leagueInfo.js';

export async function fetchNFLState() {
        return await getNFLState();
}

export async function fetchLeagueData(queryLeagueID = leagueID, yahooClient = null) {
        return await getLeagueData(queryLeagueID, yahooClient);
}

export async function fetchLeagueRosters(queryLeagueID = leagueID, yahooClient = null) {
        return await getLeagueRosters(queryLeagueID, yahooClient);
}

export async function fetchLeagueUsers(queryLeagueID = leagueID, yahooClient = null) {
        return await getLeagueUsers(queryLeagueID, yahooClient);
}

export async function fetchLeagueMatchups(queryLeagueID = leagueID, week, yahooClient = null) {
        return await getLeagueMatchups(queryLeagueID, week, yahooClient);
}

export async function fetchLeagueTransactions(queryLeagueID = leagueID, week, yahooClient = null) {
        return await getLeagueTransactions(queryLeagueID, week, yahooClient);
}

export async function fetchDraftResults(leagueKeyOrDraftID, isLeagueKey = null, yahooClient = null) {
        return await getDraftResults(leagueKeyOrDraftID, isLeagueKey, yahooClient);
}

export async function fetchDraftData(leagueKeyOrDraftID, isLeagueKey = null, yahooClient = null) {
        return await getDraftData(leagueKeyOrDraftID, isLeagueKey, yahooClient);
}

export async function fetchTradedPicks(queryLeagueID = leagueID, yahooClient = null) {
        return await getTradedPicks(queryLeagueID, yahooClient);
}

export async function fetchWinnersBracket(queryLeagueID = leagueID, yahooClient = null) {
        return await getWinnersBracket(queryLeagueID, yahooClient);
}

export async function fetchLosersBracket(queryLeagueID = leagueID, yahooClient = null) {
        return await getLosersBracket(queryLeagueID, yahooClient);
}

export async function fetchAllPlayers(yahooClient = null) {
        return await getAllPlayers(yahooClient);
}

export async function fetchPlayerStats(playerKey, week = null, yahooClient = null) {
        return await getPlayerStats(playerKey, week, yahooClient);
}

export function isPlatformYahoo() {
        return isYahooPlatform();
}

export function getActivePlatform() {
        return getPlatform();
}

export async function fetchHomePageData(yahooClient = null) {
        try {
                const [nflState, leagueData, rosters, users] = await Promise.all([
                        fetchNFLState(),
                        fetchLeagueData(leagueID, yahooClient),
                        fetchLeagueRosters(leagueID, yahooClient),
                        fetchLeagueUsers(leagueID, yahooClient)
                ]);

                return {
                        nflState,
                        leagueData,
                        rosters,
                        users
                };
        } catch (error) {
                console.error('[Yahoo Service] Error fetching homepage data:', error);
                throw error;
        }
}
