import { leagueID as configuredLeagueID, managers as configuredManagers } from '$lib/utils/leagueInfo.js';
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
import { findPreviousSeasonLeagueKey } from '$lib/yahoo-adapter/leagueAdapter.js';

const isAuthError = (err) => err?.message?.includes('missing user token') || err?.message?.includes('authentication required') || err?.description?.includes?.('logged in');

// Short-lived in-memory cache for the slow, rarely-changing Yahoo league data
// (full roster fallback walk + league users). These don't change between, say,
// a manager's keeper clicks, but each click re-runs the page load — which would
// otherwise re-hit Yahoo (walking up to 12 seasons of the renew chain) every
// time. Keeper SELECTIONS are read fresh from Postgres, so caching this Yahoo
// layer never serves stale selection state.
//
// The cache is OPT-IN: a caller must pass an explicit `cacheScope` (the viewer's
// own user id) AND an authenticated yahooClient. The scope is part of the key, so
// one member's cached payload is NEVER served to a different (or non-member)
// viewer — their own Yahoo request still decides what they can see. Pages that
// don't pass a scope (the default) are never cached, so their behavior is
// unchanged.
const LEAGUE_CACHE_TTL_MS = 60_000;
const leagueCache = new Map(); // key -> { value, expires }

export function getCachedLeagueData(key) {
        const hit = leagueCache.get(key);
        if (!hit) return undefined;
        if (hit.expires <= Date.now()) {
                leagueCache.delete(key);
                return undefined;
        }
        return hit.value;
}

export function setCachedLeagueData(key, value, ttlMs = LEAGUE_CACHE_TTL_MS) {
        leagueCache.set(key, { value, expires: Date.now() + ttlMs });
}

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
export async function loadLeagueRostersWithFallback(yahooClient = null, queryLeagueID = configuredLeagueID, cacheScope = null) {
        const canCache = !!(yahooClient && cacheScope);
        const cacheKey = `rostersFallback:${queryLeagueID}:${cacheScope}`;
        if (canCache) {
                const cached = getCachedLeagueData(cacheKey);
                if (cached !== undefined) return cached;
        }
        const result = await _loadLeagueRostersWithFallback(yahooClient, queryLeagueID);
        // Only cache genuine roster data for a scoped authenticated viewer; never
        // cache the null auth-error result (logged-out visitors must still get the
        // public view).
        if (canCache && result) setCachedLeagueData(cacheKey, result);
        return result;
}

async function _loadLeagueRostersWithFallback(yahooClient, queryLeagueID) {
        let leagueKey = queryLeagueID;
        let guard = 0;
        let currentSeasonResult = null;
        let currentName = null;
        let currentSeason = null;
        let discoveryTried = false;

        while (leagueKey && guard < 12) {
                guard++;
                const isFallback = leagueKey !== queryLeagueID;

                const [rosters, leagueData] = await waitForAll(
                        loadLeagueRosters(yahooClient, leagueKey),
                        loadLeagueData(yahooClient, leagueKey),
                );

                if (rosters === null) return null; // auth error — let the caller handle it

                if (currentSeasonResult === null) {
                        currentSeasonResult = rosters;
                        currentName = leagueData?.name ?? null;
                        currentSeason = leagueData?.season ?? null;
                }

                const hasPlayers = Object.values(rosters.rosters || {})
                        .some((r) => (r.players?.length || 0) > 0);

                if (hasPlayers) {
                        return {
                                ...rosters,
                                fromSeason: isFallback ? (leagueData?.season ?? null) : null,
                                fromLeagueKey: isFallback ? leagueKey : null
                        };
                }

                let prev = leagueData?.previous_league_id || null;

                // Yahoo's renew link is missing — discover last season's league from the
                // logged-in user's account by matching the league name (one attempt).
                if (!prev && !discoveryTried) {
                        discoveryTried = true;
                        prev = await findPreviousSeasonLeagueKey(currentName, currentSeason, yahooClient);
                        if (prev === queryLeagueID) prev = null;
                }

                if (!prev) break;
                leagueKey = prev;
        }

        return currentSeasonResult;
}

export async function loadLeagueUsers(yahooClient = null, queryLeagueID = configuredLeagueID, cacheScope = null) {
        const canCache = !!(yahooClient && cacheScope);
        const cacheKey = `users:${queryLeagueID}:${cacheScope}`;
        if (canCache) {
                const cached = getCachedLeagueData(cacheKey);
                if (cached !== undefined) return cached;
        }
        try {
                const users = await getLeagueUsersApi(queryLeagueID, yahooClient);
                // Cache only a non-empty result for a scoped authenticated viewer ([]
                // means an auth error / no client, which must not be cached).
                if (canCache && Array.isArray(users) && users.length) {
                        setCachedLeagueData(cacheKey, users);
                }
                return users;
        } catch (err) {
                if (isAuthError(err)) return [];
                throw err;
        }
}

// Self-contained copies of the two pure helpers from universalFunctions.js (which
// imports browser-only $app/navigation). getTeamData resolves a roster owner's
// team name + avatar; getRosterManagers returns the roster's manager id list.
function getRosterManagers(roster) {
        const out = [];
        if (roster?.owner_id) out.push(roster.owner_id);
        if (Array.isArray(roster?.co_owners)) {
                for (const coOwner of roster.co_owners) out.push(coOwner);
        }
        return out;
}

function getTeamData(users, ownerID) {
        const user = users[ownerID];
        if (user) {
                return {
                        avatar: user.metadata?.avatar ? user.metadata.avatar : `https://sleepercdn.com/avatars/thumbs/${user.avatar}`,
                        name: user.metadata?.team_name ? user.metadata.team_name : user.display_name
                };
        }
        return {
                avatar: 'https://sleepercdn.com/images/v2/icons/player_default.webp',
                name: 'Unknown Team'
        };
}

// Apply the same per-user normalization the (browser-only) client store did:
// fall back to display_name for user_name, override the display name with the
// configured manager name when one is registered, and normalize the avatar to a
// full URL so getTeamData doesn't double-prefix Yahoo's already-absolute image
// urls with the Sleeper CDN path.
function processLeagueUsers(rawUsers) {
        const finalUsers = {};
        for (const user of rawUsers || []) {
                if (!user || user.user_id == null) continue;
                user.user_name = user.user_name ?? user.display_name;
                if (typeof user.avatar === 'string' && /^https?:\/\//.test(user.avatar)) {
                        user.metadata = { ...(user.metadata || {}), avatar: user.metadata?.avatar || user.avatar };
                }
                finalUsers[user.user_id] = user;
                const manager = configuredManagers.find((m) => m.managerID === user.user_id);
                if (manager) finalUsers[user.user_id].display_name = manager.name;
        }
        return finalUsers;
}

// Build the `{ currentSeason, teamManagersMap, users }` structure the legacy
// display components (Matchup, Brackets, etc.) require via the
// getTeamFromTeamManagers family. The browser-only store helper
// (leagueTeamManagers.js) can't run in SSR loaders, and feeding those components
// a flat `{ user_id: user }` map makes getTeamFromTeamManagers throw the moment
// real Yahoo data renders. This server-side builder mirrors the store's logic for
// the current (live) season only.
export async function loadLiveTeamManagers(yahooClient = null, queryLeagueID = configuredLeagueID) {
        const [users, rostersResult, leagueData] = await waitForAll(
                loadLeagueUsers(yahooClient, queryLeagueID),
                loadLeagueRosters(yahooClient, queryLeagueID),
                loadLeagueData(yahooClient, queryLeagueID)
        );

        // loadLeagueRosters returns { rosters: { [roster_id]: roster }, ... } (or
        // null on an auth error), NOT a bare array.
        const rosters = Object.values(rostersResult?.rosters || {});
        const year = parseInt(leagueData?.season, 10);
        const processedUsers = processLeagueUsers(users);
        const teamManagersMap = {};

        if (Number.isFinite(year)) {
                teamManagersMap[year] = {};
                for (const roster of rosters) {
                        if (roster?.roster_id == null) continue;
                        teamManagersMap[year][roster.roster_id] = {
                                team: getTeamData(processedUsers, roster.owner_id),
                                managers: getRosterManagers(roster),
                                roster
                        };
                }
        }

        return {
                currentSeason: Number.isFinite(year) ? year : null,
                teamManagersMap,
                users: processedUsers
        };
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

// Full-season matchup fetch INCLUDING playoff weeks. loadMatchupData stops at
// playoff_week_start (regular season only); the durable archive wants every
// week's score, so this loops the whole schedule. Resilient per week — a week
// that errors (e.g. beyond the season's end) is skipped, never aborting the run.
export async function loadAllSeasonMatchups(yahooClient = null, queryLeagueID = configuredLeagueID) {
        let leagueData;
        try {
                leagueData = await getLeagueDataApi(queryLeagueID, yahooClient);
        } catch (err) {
                if (isAuthError(err)) return { matchupWeeks: [], year: null, playoffsStart: null, requiresAuth: true };
                throw err;
        }
        if (!leagueData) return { matchupWeeks: [], year: null, playoffsStart: null, requiresAuth: true };

        const year = parseInt(leagueData.season, 10);
        const playoffsStart = parseInt(leagueData?.settings?.playoff_week_start, 10) || null;
        const endWeek = parseInt(leagueData?.settings?.end_week, 10) || 18;

        const weekNums = [];
        for (let i = 1; i <= endWeek; i++) weekNums.push(i);

        const results = await waitForAll(
                ...weekNums.map((i) => getLeagueMatchupsApi(queryLeagueID, i, yahooClient).catch(() => []))
        );

        const matchupWeeks = [];
        for (let idx = 0; idx < results.length; idx++) {
                const processed = processMatchups(results[idx], weekNums[idx]);
                if (processed) {
                        matchupWeeks.push({ matchups: processed.matchups, week: processed.week });
                }
        }

        return { matchupWeeks, year: Number.isFinite(year) ? year : null, playoffsStart, requiresAuth: false };
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
        // Yahoo roster payloads embed player names/positions; aggregate every
        // roster's detail map into one lookup (keyed by Yahoo player_key) so the
        // page can resolve names without an external player map.
        const yahooPlayers = {};
        for(const roster of rosters) {
                for(const starter of roster.starters) {
                        startersAndReserve.push(starter);
                }
                if(roster.reserve) {
                        for(const ir of roster.reserve) {
                                startersAndReserve.push(ir);
                        }
                }
                if(roster.players_detail) {
                        Object.assign(yahooPlayers, roster.players_detail);
                }
                rosterMap[roster.roster_id] = roster;
        }
        return {rosters: rosterMap, startersAndReserve, yahooPlayers};
}

export async function loadPlayers(fetch) {
        return await loadPlayersUtil(fetch);
}
