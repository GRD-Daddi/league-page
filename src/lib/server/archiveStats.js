import { query } from './db.js';

/**
 * Cross-season analytics computed over the durable archive (season_archive,
 * team_season_archive, matchup_archive). These power the league-history pages
 * (Records, Awards/Trophy room, Managers, Rivalry) without any live Yahoo call,
 * so history stays available year-round — even in the offseason or if a past
 * Yahoo league is deleted.
 *
 * Identity note: Yahoo masks manager GUIDs/nicknames ("--hidden--"), so
 * `manager_name` is never populated. The only stable cross-season identity we
 * have is the TEAM NAME, which the league reuses year to year. All "manager"
 * aggregation here keys on team_name. It is a proxy — a manager who renames
 * their team reads as a new identity — but it is the best signal the data offers.
 *
 * "Completed seasons" = season_archive.status = 'complete'. The in-progress /
 * predraft current season carries zeroed stats and is excluded from all-time
 * records and career totals so it never pollutes them.
 */

const COMPLETED = `(SELECT year FROM season_archive WHERE status = 'complete')`;

/** Every archived season (newest first) with status, size and podium names. */
export async function getArchiveYears() {
        const { rows } = await query(
                `SELECT year, status, num_teams, league_name,
                        champion_name, runner_up_name, third_name
                 FROM season_archive
                 ORDER BY year DESC`
        );
        return rows.map((r) => ({
                year: r.year,
                status: r.status,
                numTeams: r.num_teams,
                leagueName: r.league_name,
                champion: r.champion_name,
                runnerUp: r.runner_up_name,
                third: r.third_name,
                isComplete: r.status === 'complete'
        }));
}

/**
 * Trophy room: every completed season's podium, newest first. Each entry also
 * carries that season's regular-season points leader and the lowest-scoring
 * finish (the "toilet bowl" wooden spoon) for richer per-season awards.
 */
export async function getTrophyRoom() {
        const { rows } = await query(
                `SELECT year, num_teams, champion_name, champion_team_key,
                        runner_up_name, third_name
                 FROM season_archive
                 WHERE champion_name IS NOT NULL
                 ORDER BY year DESC`
        );

        const out = [];
        for (const r of rows) {
                const { rows: extra } = await query(
                        `SELECT
                                (SELECT team_name FROM team_season_archive
                                 WHERE year = $1 AND points_for IS NOT NULL
                                 ORDER BY points_for DESC NULLS LAST LIMIT 1) AS points_leader,
                                (SELECT points_for FROM team_season_archive
                                 WHERE year = $1 AND points_for IS NOT NULL
                                 ORDER BY points_for DESC NULLS LAST LIMIT 1) AS points_leader_pf,
                                (SELECT team_name FROM team_season_archive
                                 WHERE year = $1 AND final_rank IS NOT NULL
                                 ORDER BY final_rank DESC NULLS LAST LIMIT 1) AS wooden_spoon`,
                        [r.year]
                );
                const e = extra[0] || {};
                out.push({
                        year: r.year,
                        numTeams: r.num_teams,
                        champion: r.champion_name,
                        championTeamKey: r.champion_team_key,
                        runnerUp: r.runner_up_name,
                        third: r.third_name,
                        pointsLeader: e.points_leader || null,
                        pointsLeaderPf: e.points_leader_pf != null ? Number(e.points_leader_pf) : null,
                        woodenSpoon: e.wooden_spoon || null
                });
        }
        return out;
}

/** Champions tallied by team name, most titles first (completed seasons only). */
export async function getChampionshipCounts() {
        const { rows } = await query(
                `SELECT champion_name AS team_name, count(*)::int AS titles,
                        array_agg(year ORDER BY year) AS years
                 FROM season_archive
                 WHERE champion_name IS NOT NULL AND status = 'complete'
                 GROUP BY champion_name
                 ORDER BY titles DESC, team_name ASC`
        );
        return rows.map((r) => ({ teamName: r.team_name, titles: r.titles, years: r.years }));
}

const numRow = (r) =>
        r
                ? {
                                year: r.year,
                                week: r.week ?? null,
                                teamName: r.team_name,
                                value: r.value != null ? Number(r.value) : null,
                                detail: r.detail || null
                  }
                : null;

/**
 * All-time league records, each attributed to a team_name + season (+ week for
 * single-game marks). Computed only over completed seasons. Returns a flat,
 * UI-ready list of { key, label, teamName, value, year, week, detail }.
 */
export async function getAllTimeRecords() {
        const single = async (sql, params = []) => {
                const { rows } = await query(sql, params);
                return rows[0] || null;
        };

        const [
                highGame,
                lowGame,
                highSeasonPf,
                lowSeasonPf,
                mostSeasonWins,
                blowout,
                nailBiter,
                highCombined
        ] = await Promise.all([
                single(
                        `SELECT year, week, team_name, points AS value
                         FROM matchup_archive
                         WHERE points > 0 AND year IN ${COMPLETED}
                         ORDER BY points DESC LIMIT 1`
                ),
                single(
                        `SELECT year, week, team_name, points AS value
                         FROM matchup_archive
                         WHERE points > 0 AND year IN ${COMPLETED}
                         ORDER BY points ASC LIMIT 1`
                ),
                single(
                        `SELECT year, team_name, points_for AS value
                         FROM team_season_archive
                         WHERE points_for IS NOT NULL AND year IN ${COMPLETED}
                         ORDER BY points_for DESC LIMIT 1`
                ),
                single(
                        `SELECT year, team_name, points_for AS value
                         FROM team_season_archive
                         WHERE points_for IS NOT NULL AND points_for > 0 AND year IN ${COMPLETED}
                         ORDER BY points_for ASC LIMIT 1`
                ),
                single(
                        `SELECT year, team_name, wins AS value,
                                (wins || '-' || losses || (CASE WHEN ties > 0 THEN '-' || ties ELSE '' END)) AS detail
                         FROM team_season_archive
                         WHERE wins IS NOT NULL AND year IN ${COMPLETED}
                         ORDER BY wins DESC, losses ASC LIMIT 1`
                ),
                single(
                        `SELECT a.year, a.week, a.team_name,
                                (a.points - b.points) AS value,
                                ('def. ' || b.team_name || ' ' || round(a.points::numeric, 2) || '–' || round(b.points::numeric, 2)) AS detail
                         FROM matchup_archive a
                         JOIN matchup_archive b
                           ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                         WHERE a.points > b.points AND b.points > 0 AND a.year IN ${COMPLETED}
                         ORDER BY (a.points - b.points) DESC LIMIT 1`
                ),
                single(
                        `SELECT a.year, a.week, a.team_name,
                                (a.points - b.points) AS value,
                                ('vs ' || b.team_name || ' ' || round(a.points::numeric, 2) || '–' || round(b.points::numeric, 2)) AS detail
                         FROM matchup_archive a
                         JOIN matchup_archive b
                           ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                         WHERE a.points > b.points AND b.points > 0 AND a.year IN ${COMPLETED}
                         ORDER BY (a.points - b.points) ASC LIMIT 1`
                ),
                single(
                        `SELECT a.year, a.week, a.team_name,
                                (a.points + b.points) AS value,
                                ('vs ' || b.team_name || ' ' || round(a.points::numeric, 2) || ' + ' || round(b.points::numeric, 2)) AS detail
                         FROM matchup_archive a
                         JOIN matchup_archive b
                           ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                         WHERE a.points > 0 AND b.points > 0 AND a.roster_id < b.roster_id AND a.year IN ${COMPLETED}
                         ORDER BY (a.points + b.points) DESC LIMIT 1`
                )
        ]);

        return [
                { key: 'highGame', label: 'Highest Single-Game Score', ...numRow(highGame) },
                { key: 'lowGame', label: 'Lowest Single-Game Score', ...numRow(lowGame) },
                { key: 'highSeasonPf', label: 'Most Points (Season)', ...numRow(highSeasonPf) },
                { key: 'lowSeasonPf', label: 'Fewest Points (Season)', ...numRow(lowSeasonPf) },
                { key: 'mostSeasonWins', label: 'Most Wins (Season)', ...numRow(mostSeasonWins) },
                { key: 'blowout', label: 'Biggest Blowout', ...numRow(blowout) },
                { key: 'nailBiter', label: 'Closest Game', ...numRow(nailBiter) },
                { key: 'highCombined', label: 'Highest Combined Score', ...numRow(highCombined) }
        ].filter((r) => r.value != null);
}

/**
 * Career totals for every team identity (by name) over completed seasons:
 * seasons played, record, points, titles, podiums and best finish. Sorted by
 * win percentage then total wins.
 */
export async function getManagerCareers() {
        const { rows } = await query(
                `SELECT team_name,
                        count(*)::int AS seasons,
                        COALESCE(sum(wins), 0)::int AS wins,
                        COALESCE(sum(losses), 0)::int AS losses,
                        COALESCE(sum(ties), 0)::int AS ties,
                        COALESCE(sum(points_for), 0) AS points_for,
                        COALESCE(sum(points_against), 0) AS points_against,
                        count(*) FILTER (WHERE final_rank = 1)::int AS titles,
                        count(*) FILTER (WHERE final_rank <= 3)::int AS podiums,
                        min(final_rank) AS best_finish
                 FROM team_season_archive
                 WHERE team_name IS NOT NULL AND year IN ${COMPLETED}
                 GROUP BY team_name`
        );

        return rows
                .map((r) => {
                        const wins = r.wins;
                        const losses = r.losses;
                        const ties = r.ties;
                        const games = wins + losses + ties;
                        return {
                                teamName: r.team_name,
                                seasons: r.seasons,
                                wins,
                                losses,
                                ties,
                                games,
                                winPct: games > 0 ? (wins + ties * 0.5) / games : 0,
                                pointsFor: Number(r.points_for),
                                pointsAgainst: Number(r.points_against),
                                titles: r.titles,
                                podiums: r.podiums,
                                bestFinish: r.best_finish
                        };
                })
                .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
}

/** Per-season finishes for a single team identity (by name), newest first. */
export async function getManagerSeasons(teamName) {
        if (!teamName) return [];
        const { rows } = await query(
                `SELECT year, team_name, final_rank, wins, losses, ties,
                        points_for, points_against, playoff_seed
                 FROM team_season_archive
                 WHERE team_name = $1
                 ORDER BY year DESC`,
                [teamName]
        );
        return rows.map((r) => ({
                year: r.year,
                teamName: r.team_name,
                finalRank: r.final_rank,
                wins: r.wins,
                losses: r.losses,
                ties: r.ties,
                pointsFor: r.points_for != null ? Number(r.points_for) : null,
                pointsAgainst: r.points_against != null ? Number(r.points_against) : null,
                playoffSeed: r.playoff_seed
        }));
}

/** Distinct team names that appear in the archive, alphabetical. */
export async function getArchiveTeamNames() {
        const { rows } = await query(
                `SELECT DISTINCT team_name FROM team_season_archive
                 WHERE team_name IS NOT NULL ORDER BY team_name ASC`
        );
        return rows.map((r) => r.team_name);
}

/**
 * Head-to-head history between two team identities (by name): every meeting,
 * plus an aggregate record. Meetings are matchup_archive sides sharing
 * (year, week, matchup_id); only games where both sides actually scored count.
 */
export async function getHeadToHead(nameA, nameB) {
        if (!nameA || !nameB || nameA === nameB) {
                return { teamA: nameA || null, teamB: nameB || null, meetings: [], summary: null };
        }

        const { rows } = await query(
                `SELECT a.year, a.week, a.is_playoffs,
                        a.points AS points_a, b.points AS points_b
                 FROM matchup_archive a
                 JOIN matchup_archive b
                   ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                 WHERE a.team_name = $1 AND b.team_name = $2 AND a.points > 0 AND b.points > 0
                 ORDER BY a.year ASC, a.week ASC`,
                [nameA, nameB]
        );

        let winsA = 0;
        let winsB = 0;
        let ties = 0;
        let totalA = 0;
        let totalB = 0;
        const meetings = rows.map((r) => {
                const pa = Number(r.points_a);
                const pb = Number(r.points_b);
                totalA += pa;
                totalB += pb;
                if (pa > pb) winsA++;
                else if (pb > pa) winsB++;
                else ties++;
                return { year: r.year, week: r.week, isPlayoffs: r.is_playoffs, pointsA: pa, pointsB: pb };
        });

        return {
                teamA: nameA,
                teamB: nameB,
                meetings,
                summary: {
                        games: meetings.length,
                        winsA,
                        winsB,
                        ties,
                        totalA,
                        totalB,
                        avgA: meetings.length ? totalA / meetings.length : 0,
                        avgB: meetings.length ? totalB / meetings.length : 0
                }
        };
}
