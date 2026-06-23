import { loadMatchupData, loadBrackets, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { captureSeason } from '$lib/server/archive.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;
        const queryWeek = url?.searchParams?.get('week');

        const [matchupsData, bracketsData, teamManagersData, playersData] = await waitForAll(
                loadMatchupData(yahooClient, leagueKey),
                loadBrackets(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey),
                loadPlayers(fetch),
        );

        // Best-effort durable snapshot of this season's matchup scores from data
        // already loaded above. Team identity (team_key/name) is filled later by the
        // commissioner backfill, which also loads rosters; here we capture the scores.
        const mYear = parseInt(matchupsData?.year, 10);
        if (!matchupsData?.requiresAuth && Number.isFinite(mYear) && matchupsData?.matchupWeeks?.length) {
                void captureSeason(mYear, {
                        matchupWeeks: matchupsData.matchupWeeks,
                        playoffsStart: Number.isFinite(matchupsData.regularSeasonLength)
                                ? matchupsData.regularSeasonLength + 1
                                : null
                }).catch((err) => console.error('[matchups] archive snapshot failed:', err.message));
        }

        return {
                queryWeek: isNaN(queryWeek) ? null : queryWeek,
                matchupsData,
                bracketsData,
                leagueTeamManagersData: teamManagersData,
                playersData
        };
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
