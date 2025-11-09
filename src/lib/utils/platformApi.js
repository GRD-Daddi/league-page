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

export async function getLeagueData(queryLeagueID = configuredLeagueID) {
        if (platform === 'yahoo') {
                return await getYahooLeagueData(queryLeagueID);
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

export async function getLeagueRosters(queryLeagueID = configuredLeagueID) {
        if (platform === 'yahoo') {
                return await getYahooLeagueRosters(queryLeagueID);
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

export async function getLeagueUsers(queryLeagueID = configuredLeagueID) {
        if (platform === 'yahoo') {
                return await getYahooLeagueUsers(queryLeagueID);
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

export async function getLeagueMatchups(queryLeagueID = configuredLeagueID, week) {
        if (platform === 'yahoo') {
                return await getYahooLeagueMatchups(queryLeagueID, week);
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

export async function getLeagueTransactions(queryLeagueID = configuredLeagueID, week) {
        if (platform === 'yahoo') {
                return await getYahooLeagueTransactions(queryLeagueID, week);
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

export async function getDraftResults(leagueKeyOrDraftID, isLeagueKey = null) {
        if (platform === 'yahoo') {
                const leagueKey = isLeagueKey !== false ? leagueKeyOrDraftID : configuredLeagueID;
                return await getYahooDraftResults(leagueKey);
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

export async function getDraftData(leagueKeyOrDraftID, isLeagueKey = null) {
        if (platform === 'yahoo') {
                const leagueKey = isLeagueKey !== false ? leagueKeyOrDraftID : configuredLeagueID;
                return await getYahooDraftData(leagueKey);
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

export async function getTradedPicks(queryLeagueID = configuredLeagueID) {
        if (platform === 'yahoo') {
                return await getYahooTradedPicks(queryLeagueID);
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

export async function getWinnersBracket(queryLeagueID = configuredLeagueID) {
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

export async function getLosersBracket(queryLeagueID = configuredLeagueID) {
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

export async function getAllPlayers() {
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

export async function getPlayerStats(playerKey, week = null) {
        if (platform === 'yahoo') {
                return await getYahooPlayerStats(configuredLeagueID, playerKey, week);
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
