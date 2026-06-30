import { loadMatchupData, loadBrackets, loadLiveTeamManagers, loadPlayers } from '$lib/server/dataLoaders.js';
import { captureSeason } from '$lib/server/archive.js';
import { getArchiveYears, getArchivedSchedule } from '$lib/server/archiveStats.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;
        const queryWeek = url?.searchParams?.get('week');
        const queryMatchup = url?.searchParams?.get('matchup');

        const years = await getArchiveYears();
        const currentYear = getCurrentSeasonYear();
        const requested = parseInt(url.searchParams.get('year'), 10);
        const selectedYear = Number.isFinite(requested) ? requested : currentYear;
        const isLive = selectedYear === currentYear;
        const yearOptions = years.map((y) => ({ year: y.year, status: y.status }));

        // Past season: serve the durable archive schedule, no Yahoo call needed.
        if (!isLive) {
                const schedule = await getArchivedSchedule(selectedYear);
                return {
                        isLive: false,
                        years: yearOptions,
                        selectedYear,
                        schedule,
                        queryWeek: isNaN(queryWeek) ? null : queryWeek,
                        queryMatchup: queryMatchup == null || isNaN(queryMatchup) ? null : Number(queryMatchup),
                        matchupsData: null,
                        bracketsData: null,
                        leagueTeamManagersData: {},
                        playersData: null
                };
        }

        const [matchupsData, bracketsData, teamManagersData, playersData] = await waitForAll(
                loadMatchupData(yahooClient, leagueKey),
                loadBrackets(yahooClient, leagueKey),
                loadLiveTeamManagers(yahooClient, leagueKey),
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
                isLive: true,
                years: yearOptions,
                selectedYear,
                schedule: null,
                queryWeek: isNaN(queryWeek) ? null : queryWeek,
                queryMatchup: queryMatchup == null || isNaN(queryMatchup) ? null : Number(queryMatchup),
                matchupsData,
                bracketsData,
                leagueTeamManagersData: teamManagersData,
                playersData
        };
}
