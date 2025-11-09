import { platform as selectedPlatform, leagueID as configuredLeagueID } from './leagueInfo.js';
import {
        getYahooLeagueData,
        getYahooLeagueRosters,
        getYahooLeagueUsers,
        getYahooLeagueMatchups,
        getYahooNFLState,
        getYahooLeagueTransactions,
        getYahooDraftResults,
        getYahooDraftData,
        getYahooTradedPicks,
        getYahooPlayers,
        getYahooPlayerStats
} from '$lib/yahoo-adapter';

const platform = selectedPlatform?.toLowerCase() || 'sleeper';

export async function getLeagueData(queryLeagueID = configuredLeagueID, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooLeagueData(queryLeagueID, yahooClient);
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getLeagueRosters(queryLeagueID = configuredLeagueID, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooLeagueRosters(queryLeagueID, yahooClient);
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/rosters`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getLeagueUsers(queryLeagueID = configuredLeagueID, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooLeagueUsers(queryLeagueID, yahooClient);
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/users`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getLeagueMatchups(queryLeagueID = configuredLeagueID, week, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooLeagueMatchups(queryLeagueID, week, yahooClient);
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/matchups/${week}`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getNFLState() {
        if (platform === 'yahoo') {
                return await getYahooNFLState();
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/state/nfl`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getLeagueTransactions(queryLeagueID = configuredLeagueID, week, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooLeagueTransactions(queryLeagueID, week, yahooClient);
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/transactions/${week}`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getDraftResults(leagueKeyOrDraftID, isLeagueKey = null, yahooClient = null) {
        if (platform === 'yahoo') {
                const leagueKey = isLeagueKey !== false ? leagueKeyOrDraftID : configuredLeagueID;
                return await getYahooDraftResults(leagueKey, yahooClient);
        } else {
                const draftID = leagueKeyOrDraftID;
                const res = await fetch(`https://api.sleeper.app/v1/draft/${draftID}/picks`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getDraftData(leagueKeyOrDraftID, isLeagueKey = null, yahooClient = null) {
        if (platform === 'yahoo') {
                const leagueKey = isLeagueKey !== false ? leagueKeyOrDraftID : configuredLeagueID;
                return await getYahooDraftData(leagueKey, yahooClient);
        } else {
                const draftID = leagueKeyOrDraftID;
                const res = await fetch(`https://api.sleeper.app/v1/draft/${draftID}`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getTradedPicks(queryLeagueID = configuredLeagueID, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooTradedPicks(queryLeagueID, yahooClient);
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/traded_picks`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getWinnersBracket(queryLeagueID = configuredLeagueID, yahooClient = null) {
        if (platform === 'yahoo') {
                return [];
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/winners_bracket`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getLosersBracket(queryLeagueID = configuredLeagueID, yahooClient = null) {
        if (platform === 'yahoo') {
                return [];
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/league/${queryLeagueID}/losers_bracket`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getAllPlayers(yahooClient = null) {
        if (platform === 'yahoo') {
                return {};
        } else {
                const res = await fetch(`https://api.sleeper.app/v1/players/nfl`, {compress: true});
                const data = await res.json();
                if (res.ok) {
                        return data;
                } else {
                        throw new Error(data);
                }
        }
}

export async function getPlayerStats(playerKey, week = null, yahooClient = null) {
        if (platform === 'yahoo') {
                return await getYahooPlayerStats(configuredLeagueID, playerKey, week, yahooClient);
        } else {
                return {};
        }
}

export function isYahooPlatform() {
        return platform === 'yahoo';
}

export function getPlatform() {
        return platform;
}
