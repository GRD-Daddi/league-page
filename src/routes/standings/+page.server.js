import { loadLeagueData, loadLeagueRosters, loadLeagueUsers } from '$lib/server/dataLoaders.js';
import { captureSeason, getArchivedStandings } from '$lib/server/archive.js';
import { getArchiveYears } from '$lib/server/archiveStats.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { ownerDisplayName } from '$lib/utils/ownerNames.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;
        const years = await getArchiveYears();
        const currentYear = getCurrentSeasonYear();

        const requested = parseInt(url.searchParams.get('year'), 10);
        const selectedYear = Number.isFinite(requested) ? requested : (years[0]?.year ?? currentYear);
        const isLive = selectedYear === currentYear;

        const yearOptions = years.map((y) => ({ year: y.year, status: y.status }));

        // Past season: serve the durable archive, no Yahoo call needed.
        if (!isLive) {
                const rows = await getArchivedStandings(selectedYear);
                const archivedStandings = rows.map((r, i) => ({
                        rank: r.final_rank ?? i + 1,
                        team: r.team_name ?? 'Unknown Team',
                        manager: r.manager_name ? ownerDisplayName(r.manager_name) : null,
                        logo: r.logo_url ?? null,
                        w: r.wins ?? 0,
                        l: r.losses ?? 0,
                        t: r.ties ?? 0,
                        pf: r.points_for != null ? Number(r.points_for) : 0,
                        pa: r.points_against != null ? Number(r.points_against) : 0,
                        seed: r.playoff_seed ?? null
                }));
                return { years: yearOptions, selectedYear, isLive, archivedStandings, standingsData: null, leagueTeamManagersData: {} };
        }

        // Current season: live Yahoo standings (and a best-effort archive snapshot).
        const [standingsData, leagueTeamManagersData] = await waitForAll(
                loadStandingsData(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey)
        );

        const { rosters, leagueData } = standingsData || {};
        const year = parseInt(leagueData?.season, 10);
        if (Number.isFinite(year) && rosters) {
                void captureSeason(year, { leagueData, rostersResult: { rosters } }).catch((err) =>
                        console.error('[standings] archive snapshot failed:', err.message)
                );
        }

        return { years: yearOptions, selectedYear, isLive, archivedStandings: null, standingsData, leagueTeamManagersData };
}

async function loadStandingsData(yahooClient, leagueKey) {
        const [rosters, leagueData] = await waitForAll(
                loadLeagueRosters(yahooClient, leagueKey),
                loadLeagueData(yahooClient, leagueKey)
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
