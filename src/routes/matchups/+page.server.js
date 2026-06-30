import { loadMatchupData, loadLiveTeamManagers } from '$lib/server/dataLoaders.js';
import { captureSeason } from '$lib/server/archive.js';
import { getArchiveYears, getArchivedSchedule } from '$lib/server/archiveStats.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

export async function load({ url, locals }) {
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

        const [matchupsData, teamManagersData] = await waitForAll(
                loadMatchupData(yahooClient, leagueKey),
                loadLiveTeamManagers(yahooClient, leagueKey)
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

        // Render the live season through the SAME card path as past seasons by
        // shaping the Yahoo payload into the archive's `schedule` structure.
        const schedule = buildLiveSchedule(matchupsData, teamManagersData);

        return {
                isLive: true,
                years: yearOptions,
                selectedYear,
                schedule,
                week: matchupsData?.week != null ? Number(matchupsData.week) : null,
                queryWeek: isNaN(queryWeek) ? null : queryWeek,
                queryMatchup: queryMatchup == null || isNaN(queryMatchup) ? null : Number(queryMatchup)
        };
}

// Transform the live Yahoo matchup payload into the archive's `schedule` shape
// (see getArchivedSchedule) so live and past seasons render through one identical
// card. Team name/avatar come from the live team-managers map; Yahoo doesn't
// expose owner display names for the current season, so live cards lead with the
// team name (the archive supplies owner names for past seasons).
function buildLiveSchedule(matchupsData, teamManagersData) {
        const weeks = matchupsData?.matchupWeeks;
        if (!Array.isArray(weeks) || !weeks.length) return [];
        const year = parseInt(matchupsData.year, 10);
        const regularSeasonLength = Number(matchupsData.regularSeasonLength) || 0;
        const teamMap = teamManagersData?.teamManagersMap?.[year] || {};

        const sideFor = (team) => {
                if (!team) return null;
                const info = teamMap[team.roster_id];
                const points = Array.isArray(team.points)
                        ? team.points.reduce((sum, p) => sum + (Number(p) || 0), 0)
                        : Number(team.points) || 0;
                return {
                        rosterId: team.roster_id,
                        teamName: info?.team?.name ?? 'Unknown Team',
                        ownerName: null,
                        avatar: info?.team?.avatar ?? null,
                        points
                };
        };

        return weeks.map((wk) => ({
                week: wk.week,
                isPlayoffs: regularSeasonLength ? wk.week > regularSeasonLength : false,
                games: (wk.matchups || []).map((pair) => {
                        const home = sideFor(pair?.[0]);
                        const away = sideFor(pair?.[1]);
                        const rawId = pair?.[0]?.matchup_id ?? pair?.[1]?.matchup_id;
                        const matchupId = rawId != null ? Number(rawId) : null;
                        let winner = null;
                        if (home && away) {
                                if (home.points > away.points) winner = home.rosterId;
                                else if (away.points > home.points) winner = away.rosterId;
                                else if (home.points > 0 || away.points > 0) winner = 'tie';
                        }
                        return { matchupId, home, away, winner, bracket: null };
                })
        }));
}
