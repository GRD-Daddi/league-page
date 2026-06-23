import { loadLeagueData, loadLeagueRostersWithFallback, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { captureSeason } from '$lib/server/archive.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;

        const rostersInfo = waitForAll(
                loadLeagueData(yahooClient, leagueKey),
                loadLeagueRostersWithFallback(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey),
                loadPlayers(fetch),
        );

        // Best-effort durable snapshot of the final rosters once the (streamed)
        // load resolves. When rosters came from a prior season via the renew-chain
        // fallback, archive under that season and skip the (current-season) league
        // header so we don't mislabel the year.
        rostersInfo
                .then(([leagueData, rostersResult]) => {
                        const fallback = rostersResult?.fromSeason ? parseInt(rostersResult.fromSeason, 10) : null;
                        const year = Number.isFinite(fallback) ? fallback : parseInt(leagueData?.season, 10);
                        if (!Number.isFinite(year) || !rostersResult) return;
                        const ld = Number.isFinite(fallback) ? null : leagueData;
                        return captureSeason(year, { leagueData: ld, rostersResult });
                })
                .catch((err) => console.error('[rosters] archive snapshot failed:', err?.message));

        return { rostersInfo };
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
