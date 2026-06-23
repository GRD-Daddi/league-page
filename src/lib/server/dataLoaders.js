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

const isAuthError = (err) => err?.message?.includes('missing user token') || err?.message?.includes('authentication required') || err?.description?.includes?.('logged in');

export async function loadLeagueData(yahooClient = null, queryLeagueID = configuredLeagueID) {
        try {
                return await getLeagueDataApi(queryLeagueID, yahooClient);
        } catch (err) {
                if (isAuthError(err)) return null;
                throw err;
        }
}

export async function loadLeagueRosters(yahooClient = null, queryLeagueID = configuredLeagueID) {
        try {
                const rosters = await getLeagueRostersApi(queryLeagueID, yahooClient);
                return processRosters(rosters);
        } catch (err) {
                if (isAuthError(err)) return null;
                throw err;
        }
}

// During the preseason / pre-draft window the current Yahoo league has no rosters
// yet — players are imported at the roster-import deadline or added via the draft.
// For a dynasty league the meaningful squads live in the most recent completed
// season, which Yahoo links via the `renew` chain (exposed as previous_league_id).
// Walk that chain until we find a season whose teams actually have players, so the
// rosters page shows last season's rosters instead of a wall of "No Players".
export async function loadLeagueRostersWithFallback(yahooClient = null, queryLeagueID = configuredLeagueID) {
        let leagueKey = queryLeagueID;
        let guard = 0;
        let currentSeasonResult = null;

        while (leagueKey && guard < 12) {
                guard++;
                const isFallback = leagueKey !== queryLeagueID;

                const [rosters, leagueData] = await waitForAll(
                        loadLeagueRosters(yahooClient, leagueKey),
                        loadLeagueData(yahooClient, leagueKey),
                );

                if (rosters === null) return null; // auth error — let the caller handle it

                if (currentSeasonResult === null) currentSeasonResult = rosters;

                const hasPlayers = Object.values(rosters.rosters || {})
                        .some((r) => (r.players?.length || 0) > 0);

                console.log('[Yahoo Adapter] DIAG roster-fallback', leagueKey,
                        '| season:', leagueData?.season,
                        '| hasPlayers:', hasPlayers,
                        '| previous_league_id:', leagueData?.previous_league_id);

                if (hasPlayers) {
                        return {
                                ...rosters,
                                fromSeason: isFallback ? (leagueData?.season ?? null) : null,
                                fromLeagueKey: isFallback ? leagueKey : null
                        };
                }

                const prev = leagueData?.previous_league_id || null;
                if (!prev) break;
                leagueKey = prev;
        }

        return currentSeasonResult;
}

export async function loadLeagueUsers(yahooClient = null, queryLeagueID = configuredLeagueID) {
        try {
                return await getLeagueUsersApi(queryLeagueID, yahooClient);
        } catch (err) {
                if (isAuthError(err)) return [];
                throw err;
        }
}

export async function loadLeagueMatchups(yahooClient = null, queryLeagueID = configuredLeagueID, week) {
        try {
                return await getLeagueMatchupsApi(queryLeagueID, week, yahooClient);
        } catch (err) {
                if (isAuthError(err)) return [];
                throw err;
        }
}

export async function loadNFLState(yahooClient = null) {
        try {
                return await getNFLStateApi(yahooClient);
        } catch (err) {
                if (isAuthError(err)) return null;
                throw err;
        }
}

export async function loadLeagueTransactions(yahooClient = null, queryLeagueID = configuredLeagueID, week) {
        try {
                return await getLeagueTransactionsApi(queryLeagueID, week, yahooClient);
        } catch (err) {
                if (isAuthError(err)) return [];
                throw err;
        }
}

export async function loadDraftResults(yahooClient = null, leagueKeyOrDraftID, isLeagueKey = null) {
        try {
                return await getDraftResultsApi(leagueKeyOrDraftID, isLeagueKey, yahooClient);
        } catch (err) {
                if (isAuthError(err)) return null;
                throw err;
        }
}

export async function loadMatchupData(yahooClient = null, queryLeagueID = configuredLeagueID) {
        let nflState, leagueData;
        try {
                [nflState, leagueData] = await waitForAll(
                        getNFLStateApi(yahooClient),
                        getLeagueDataApi(queryLeagueID, yahooClient),
                );
        } catch (err) {
                if (isAuthError(err)) {
                        return { matchupWeeks: [], year: null, week: 1, regularSeasonLength: 0, requiresAuth: true };
                }
                throw err;
        }

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
        let rosterRes, leagueData;
        try {
                [rosterRes, leagueData] = await waitForAll(
                        loadLeagueRosters(yahooClient, queryLeagueID),
                        getLeagueDataApi(queryLeagueID, yahooClient),
                );
        } catch (err) {
                if (isAuthError(err)) {
                        return { winnersData: null, losersData: null, playoffMatchups: [], numRosters: 0, year: null, playoffType: 0, playoffsStart: 0, requiresAuth: true };
                }
                throw err;
        }

        if (!rosterRes || !leagueData) {
                return { winnersData: null, losersData: null, playoffMatchups: [], numRosters: 0, year: null, playoffType: 0, playoffsStart: 0, requiresAuth: true };
        }

        const numRosters = Object.keys(rosterRes.rosters || {}).length;

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
