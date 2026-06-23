import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { captureSeason } from '$lib/server/archive.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;

        const [standingsData, leagueTeamManagersData] = await waitForAll(
                loadStandingsData(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey),
        );

        // Best-effort durable snapshot of the live standings from data already
        // loaded above (no extra Yahoo calls). Fire-and-forget so the page never
        // waits on — or fails because of — the archive write.
        const { rosters, leagueData } = standingsData || {};
        const year = parseInt(leagueData?.season, 10);
        if (Number.isFinite(year) && rosters) {
                void captureSeason(year, { leagueData, rostersResult: { rosters } })
                        .catch((err) => console.error('[standings] archive snapshot failed:', err.message));
        }

        return { standingsData, leagueTeamManagersData };
}

async function loadStandingsData(yahooClient, leagueKey) {
        const [rosters, leagueData] = await waitForAll(
                loadLeagueRosters(yahooClient, leagueKey),
                loadLeagueData(yahooClient, leagueKey),
        );
        return { rosters: rosters?.rosters, leagueData };
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
