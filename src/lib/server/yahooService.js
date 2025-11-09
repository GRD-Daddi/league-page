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

export async function fetchLeagueData(queryLeagueID = leagueID) {
        return await getLeagueData(queryLeagueID);
}

export async function fetchLeagueRosters(queryLeagueID = leagueID) {
        return await getLeagueRosters(queryLeagueID);
}

export async function fetchLeagueUsers(queryLeagueID = leagueID) {
        return await getLeagueUsers(queryLeagueID);
}

export async function fetchLeagueMatchups(queryLeagueID = leagueID, week) {
        return await getLeagueMatchups(queryLeagueID, week);
}

export async function fetchLeagueTransactions(queryLeagueID = leagueID, week) {
        return await getLeagueTransactions(queryLeagueID, week);
}

export async function fetchDraftResults(leagueKeyOrDraftID, isLeagueKey = null) {
        return await getDraftResults(leagueKeyOrDraftID, isLeagueKey);
}

export async function fetchDraftData(leagueKeyOrDraftID, isLeagueKey = null) {
        return await getDraftData(leagueKeyOrDraftID, isLeagueKey);
}

export async function fetchTradedPicks(queryLeagueID = leagueID) {
        return await getTradedPicks(queryLeagueID);
}

export async function fetchWinnersBracket(queryLeagueID = leagueID) {
        return await getWinnersBracket(queryLeagueID);
}

export async function fetchLosersBracket(queryLeagueID = leagueID) {
        return await getLosersBracket(queryLeagueID);
}

export async function fetchAllPlayers() {
        return await getAllPlayers();
}

export async function fetchPlayerStats(playerKey, week = null) {
        return await getPlayerStats(playerKey, week);
}

export function isPlatformYahoo() {
        return isYahooPlatform();
}

export function getActivePlatform() {
        return getPlatform();
}

export async function fetchHomePageData() {
        try {
                const [nflState, leagueData, rosters, users] = await Promise.all([
                        fetchNFLState(),
                        fetchLeagueData(),
                        fetchLeagueRosters(),
                        fetchLeagueUsers()
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
