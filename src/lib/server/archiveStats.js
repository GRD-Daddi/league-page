import { query } from './db.js';
import { ownerDisplayName } from '../utils/ownerNames.js';

/**
 * Cross-season analytics computed over the durable archive (season_archive,
 * team_season_archive, matchup_archive). These power the league-history pages
 * (Records, Awards/Trophy room, Managers, Rivalry) without any live Yahoo call,
 * so history stays available year-round — even in the offseason or if a past
 * Yahoo league is deleted.
 *
 * Identity note: Yahoo masks manager GUIDs ("--hidden--") but exposes each
 * manager's first-name NICKNAME, which is stable across every season. That
 * nickname (stored in team_season_archive.manager_name) is the OWNER identity
 * all cross-season aggregation keys on, so a manager who renames their team year
 * to year still reads as one person. The team name used in a given season is
 * carried alongside as sub-detail. Raw nicknames are turned into display labels
 * with ownerDisplayName().
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
 * Full per-season schedule for the historical MATCHUPS view: every week's games
 * grouped by matchup, each side carrying the owner (manager nickname) resolved
 * for that season plus the team name used that year. Powers the archive matchups
 * page and the deep-links from record cards (?year=&week=&matchup=).
 */
export async function getArchivedSchedule(year) {
        if (!Number.isFinite(year)) return [];
        const { rows } = await query(
                `SELECT m.week, m.matchup_id, m.roster_id, m.team_key, m.team_name,
                        m.points, m.is_playoffs, ts.manager_name AS owner
                 FROM matchup_archive m
                 LEFT JOIN team_season_archive ts ON ts.year = m.year AND ts.team_key = m.team_key
                 WHERE m.year = $1
                 ORDER BY m.week ASC, m.matchup_id ASC, m.points DESC NULLS LAST`,
                [year]
        );

        const side = (r) => ({
                rosterId: r.roster_id,
                teamKey: r.team_key,
                teamName: r.team_name,
                owner: r.owner ?? null,
                ownerName: r.owner ? ownerDisplayName(r.owner) : null,
                points: r.points != null ? Number(r.points) : null
        });

        const weekMap = new Map();
        for (const r of rows) {
                if (!weekMap.has(r.week)) weekMap.set(r.week, { week: r.week, isPlayoffs: !!r.is_playoffs, games: new Map() });
                const wk = weekMap.get(r.week);
                if (r.is_playoffs) wk.isPlayoffs = true;
                if (!wk.games.has(r.matchup_id)) wk.games.set(r.matchup_id, { matchupId: r.matchup_id, sides: [] });
                wk.games.get(r.matchup_id).sides.push(side(r));
        }

        return [...weekMap.values()].map((wk) => ({
                week: wk.week,
                isPlayoffs: wk.isPlayoffs,
                games: [...wk.games.values()].map((g) => {
                        const [a, b] = g.sides;
                        let winner = null;
                        if (a && b && a.points != null && b.points != null) {
                                if (a.points > b.points) winner = a.rosterId;
                                else if (b.points > a.points) winner = b.rosterId;
                                else winner = 'tie';
                        }
                        return { matchupId: g.matchupId, home: a ?? null, away: b ?? null, winner };
                })
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

/**
 * Champions tallied by OWNER (manager nickname), most titles first (completed
 * seasons only). The team name used for each title is carried as sub-detail.
 */
export async function getChampionshipCounts() {
        const { rows } = await query(
                `SELECT manager_name AS owner,
                        count(*)::int AS titles,
                        array_agg(year ORDER BY year) AS years,
                        array_agg(team_name ORDER BY year) AS team_names
                 FROM team_season_archive
                 WHERE final_rank = 1 AND manager_name IS NOT NULL AND trim(manager_name) <> '' AND year IN ${COMPLETED}
                 GROUP BY manager_name
                 ORDER BY max(year) DESC, titles DESC, owner ASC`
        );
        return rows.map((r) => ({
                owner: r.owner,
                ownerName: ownerDisplayName(r.owner),
                titles: r.titles,
                years: r.years,
                teamNames: r.team_names || []
        }));
}

const numRow = (r) =>
        r
                ? {
                                year: r.year,
                                week: r.week ?? null,
                                matchupId: r.matchup_id ?? null,
                                owner: r.owner ?? null,
                                ownerName: r.owner ? ownerDisplayName(r.owner) : null,
                                teamName: r.team_name,
                                ownerNameB: r.owner_b ? ownerDisplayName(r.owner_b) : null,
                                teamBName: r.team_b_name ?? null,
                                value: r.value != null ? Number(r.value) : null,
                                detail: r.detail || null
                  }
                : null;

/**
 * All-time league records, each attributed to an OWNER (manager nickname) plus
 * the team name + season (+ week for single-game marks) it was set under.
 * Computed only over completed seasons. Returns a flat, UI-ready list of
 * { key, label, owner, ownerName, teamName, value, year, week, detail }.
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
                        `SELECT m.year, m.week, m.matchup_id AS matchup_id, m.team_name, ts.manager_name AS owner, m.points AS value
                         FROM matchup_archive m
                         LEFT JOIN team_season_archive ts ON ts.year = m.year AND ts.team_key = m.team_key
                         WHERE m.points > 0 AND m.year IN ${COMPLETED}
                         ORDER BY m.points DESC LIMIT 1`
                ),
                single(
                        `SELECT m.year, m.week, m.matchup_id AS matchup_id, m.team_name, ts.manager_name AS owner, m.points AS value
                         FROM matchup_archive m
                         LEFT JOIN team_season_archive ts ON ts.year = m.year AND ts.team_key = m.team_key
                         WHERE m.points > 0 AND m.year IN ${COMPLETED}
                         ORDER BY m.points ASC LIMIT 1`
                ),
                single(
                        `SELECT year, team_name, manager_name AS owner, points_for AS value
                         FROM team_season_archive
                         WHERE points_for IS NOT NULL AND year IN ${COMPLETED}
                         ORDER BY points_for DESC LIMIT 1`
                ),
                single(
                        `SELECT year, team_name, manager_name AS owner, points_for AS value
                         FROM team_season_archive
                         WHERE points_for IS NOT NULL AND points_for > 0 AND year IN ${COMPLETED}
                         ORDER BY points_for ASC LIMIT 1`
                ),
                single(
                        `SELECT year, team_name, manager_name AS owner, wins AS value,
                                (wins || '-' || losses || (CASE WHEN ties > 0 THEN '-' || ties ELSE '' END)) AS detail
                         FROM team_season_archive
                         WHERE wins IS NOT NULL AND year IN ${COMPLETED}
                         ORDER BY wins DESC, losses ASC LIMIT 1`
                ),
                single(
                        `SELECT a.year, a.week, a.matchup_id AS matchup_id, a.team_name, ts.manager_name AS owner,
                                (a.points - b.points) AS value,
                                ('def. ' || b.team_name || ' ' || round(a.points::numeric, 2) || '–' || round(b.points::numeric, 2)) AS detail
                         FROM matchup_archive a
                         JOIN matchup_archive b
                           ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                         LEFT JOIN team_season_archive ts ON ts.year = a.year AND ts.team_key = a.team_key
                         WHERE a.points > b.points AND b.points > 0 AND a.year IN ${COMPLETED}
                         ORDER BY (a.points - b.points) DESC LIMIT 1`
                ),
                single(
                        `SELECT a.year, a.week, a.matchup_id AS matchup_id, a.team_name, ts.manager_name AS owner,
                                tb.manager_name AS owner_b, b.team_name AS team_b_name,
                                (a.points - b.points) AS value,
                                (round(a.points::numeric, 2) || '–' || round(b.points::numeric, 2)) AS detail
                         FROM matchup_archive a
                         JOIN matchup_archive b
                           ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                         LEFT JOIN team_season_archive ts ON ts.year = a.year AND ts.team_key = a.team_key
                         LEFT JOIN team_season_archive tb ON tb.year = b.year AND tb.team_key = b.team_key
                         WHERE a.points > b.points AND b.points > 0 AND a.year IN ${COMPLETED}
                         ORDER BY (a.points - b.points) ASC LIMIT 1`
                ),
                single(
                        `SELECT a.year, a.week, a.matchup_id AS matchup_id, a.team_name, ts.manager_name AS owner,
                                tb.manager_name AS owner_b, b.team_name AS team_b_name,
                                (a.points + b.points) AS value,
                                (round(a.points::numeric, 2) || ' + ' || round(b.points::numeric, 2)) AS detail
                         FROM matchup_archive a
                         JOIN matchup_archive b
                           ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                         LEFT JOIN team_season_archive ts ON ts.year = a.year AND ts.team_key = a.team_key
                         LEFT JOIN team_season_archive tb ON tb.year = b.year AND tb.team_key = b.team_key
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
                { key: 'nailBiter', label: 'Closest Game', joiner: 'vs', ...numRow(nailBiter) },
                { key: 'highCombined', label: 'Highest Combined Score', joiner: '&', ...numRow(highCombined) }
        ].filter((r) => r.value != null);
}

/**
 * Career totals for every OWNER (manager nickname) over completed seasons:
 * seasons played, record, points, titles, podiums and best finish, plus the
 * list of team names they've used and a per-season breakdown. Sorted by win
 * percentage then total wins.
 */
export async function getManagerCareers() {
        const { rows } = await query(
                `SELECT manager_name AS owner,
                        count(*)::int AS seasons,
                        COALESCE(sum(wins), 0)::int AS wins,
                        COALESCE(sum(losses), 0)::int AS losses,
                        COALESCE(sum(ties), 0)::int AS ties,
                        COALESCE(sum(points_for), 0) AS points_for,
                        COALESCE(sum(points_against), 0) AS points_against,
                        count(*) FILTER (WHERE final_rank = 1)::int AS titles,
                        count(*) FILTER (WHERE final_rank <= 3)::int AS podiums,
                        min(final_rank) AS best_finish,
                        (array_agg(team_name ORDER BY year DESC))[1] AS latest_team,
                        json_agg(json_build_object(
                                'year', year,
                                'teamName', team_name,
                                'finalRank', final_rank,
                                'wins', wins,
                                'losses', losses,
                                'ties', ties,
                                'pointsFor', points_for
                        ) ORDER BY year DESC) AS season_rows
                 FROM team_season_archive
                 WHERE manager_name IS NOT NULL AND trim(manager_name) <> '' AND year IN ${COMPLETED}
                 GROUP BY manager_name`
        );

        return rows
                .map((r) => {
                        const wins = r.wins;
                        const losses = r.losses;
                        const ties = r.ties;
                        const games = wins + losses + ties;
                        const seasonsList = (r.season_rows || []).map((s) => ({
                                year: s.year,
                                teamName: s.teamName,
                                finalRank: s.finalRank,
                                wins: s.wins,
                                losses: s.losses,
                                ties: s.ties,
                                pointsFor: s.pointsFor != null ? Number(s.pointsFor) : null
                        }));
                        return {
                                owner: r.owner,
                                ownerName: ownerDisplayName(r.owner),
                                latestTeam: r.latest_team,
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
                                bestFinish: r.best_finish,
                                seasonsList
                        };
                })
                .sort((a, b) => b.winPct - a.winPct || b.wins - a.wins);
}

/**
 * Per-season finishes for a single OWNER (manager nickname), newest first. Each
 * row carries the team name used that year. Includes the in-progress season.
 */
export async function getManagerSeasons(owner) {
        if (!owner) return [];
        const { rows } = await query(
                `SELECT year, team_name, final_rank, wins, losses, ties,
                        points_for, points_against, playoff_seed
                 FROM team_season_archive
                 WHERE manager_name = $1
                 ORDER BY year DESC`,
                [owner]
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

/**
 * Distinct OWNERS in the archive, sorted by display name. Each entry is
 * { owner (raw nickname / key), ownerName (display label) }.
 */
export async function getArchiveOwners() {
        const { rows } = await query(
                `SELECT DISTINCT manager_name AS owner FROM team_season_archive
                 WHERE manager_name IS NOT NULL AND trim(manager_name) <> ''`
        );
        return rows
                .map((r) => ({ owner: r.owner, ownerName: ownerDisplayName(r.owner) }))
                .sort((a, b) => a.ownerName.localeCompare(b.ownerName));
}

/** Resolve an owner (manager nickname) from a team name, most recent year first. */
export async function getOwnerByTeamName(teamName) {
        if (!teamName) return null;
        const { rows } = await query(
                `SELECT manager_name FROM team_season_archive
                 WHERE team_name = $1 AND manager_name IS NOT NULL AND trim(manager_name) <> ''
                 ORDER BY year DESC LIMIT 1`,
                [teamName]
        );
        return rows[0]?.manager_name || null;
}

/**
 * Head-to-head history between two OWNERS (by manager nickname): every meeting,
 * plus an aggregate record. Meetings are matchup_archive sides sharing
 * (year, week, matchup_id), resolved to owners via team_season_archive; only
 * games where both sides actually scored count.
 */
export async function getHeadToHead(ownerA, ownerB) {
        if (!ownerA || !ownerB || ownerA === ownerB) {
                return { teamA: ownerA || null, teamB: ownerB || null, meetings: [], summary: null };
        }

        const { rows } = await query(
                `SELECT a.year, a.week, a.is_playoffs,
                        a.points AS points_a, b.points AS points_b,
                        a.team_name AS team_a_name, b.team_name AS team_b_name
                 FROM matchup_archive a
                 JOIN matchup_archive b
                   ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                 JOIN team_season_archive ta ON ta.year = a.year AND ta.team_key = a.team_key
                 JOIN team_season_archive tb ON tb.year = b.year AND tb.team_key = b.team_key
                 WHERE ta.manager_name = $1 AND tb.manager_name = $2 AND a.points > 0 AND b.points > 0
                 ORDER BY a.year ASC, a.week ASC`,
                [ownerA, ownerB]
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
                return {
                        year: r.year,
                        week: r.week,
                        isPlayoffs: r.is_playoffs,
                        pointsA: pa,
                        pointsB: pb,
                        teamAName: r.team_a_name,
                        teamBName: r.team_b_name
                };
        });

        return {
                teamA: ownerA,
                teamB: ownerB,
                teamAName: ownerDisplayName(ownerA),
                teamBName: ownerDisplayName(ownerB),
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

// Personalized rivalry awards for a single owner: their head-to-head record
// against every other owner across league history, distilled into a handful of
// (intentionally cheeky) superlatives shown on the rivalry page.
export async function getOwnerRivalries(owner) {
        if (!owner) return null;

        const { rows } = await query(
                `SELECT tb.manager_name AS opp,
                        a.year, a.week,
                        a.points AS my_points, b.points AS opp_points
                 FROM matchup_archive a
                 JOIN matchup_archive b
                   ON a.year = b.year AND a.week = b.week AND a.matchup_id = b.matchup_id AND a.roster_id <> b.roster_id
                 JOIN team_season_archive ta ON ta.year = a.year AND ta.team_key = a.team_key
                 JOIN team_season_archive tb ON tb.year = b.year AND tb.team_key = b.team_key
                 WHERE ta.manager_name = $1
                   AND tb.manager_name IS NOT NULL AND trim(tb.manager_name) <> '' AND tb.manager_name <> $1
                   AND a.points > 0 AND b.points > 0`,
                [owner]
        );

        const ownerName = ownerDisplayName(owner);
        const map = new Map();
        let closestLoss = null; // smallest-margin single-game defeat across all opponents
        let biggestWin = null; // largest-margin single-game victory across all opponents

        for (const r of rows) {
                let o = map.get(r.opp);
                if (!o) {
                        o = {
                                owner: r.opp,
                                ownerName: ownerDisplayName(r.opp),
                                games: 0,
                                wins: 0,
                                losses: 0,
                                ties: 0,
                                pf: 0,
                                pa: 0
                        };
                        map.set(r.opp, o);
                }
                const my = Number(r.my_points);
                const opp = Number(r.opp_points);
                o.games++;
                o.pf += my;
                o.pa += opp;
                if (my > opp) {
                        o.wins++;
                        const margin = my - opp;
                        if (!biggestWin || margin > biggestWin.margin) {
                                biggestWin = { owner: o.owner, ownerName: o.ownerName, margin, year: r.year, week: r.week, my, opp };
                        }
                } else if (opp > my) {
                        o.losses++;
                        const margin = opp - my;
                        if (!closestLoss || margin < closestLoss.margin) {
                                closestLoss = { owner: o.owner, ownerName: o.ownerName, margin, year: r.year, week: r.week, my, opp };
                        }
                } else {
                        o.ties++;
                }
        }

        const opponents = [...map.values()].map((o) => ({
                ...o,
                winPct: o.games ? o.wins / o.games : 0,
                record: `${o.wins}-${o.losses}${o.ties ? '-' + o.ties : ''}`
        }));

        if (!opponents.length) {
                return { owner, ownerName, awards: [] };
        }

        const pct = (o) => `${Math.round(o.winPct * 100)}% win rate`;
        const meetingsLabel = (o) => `${o.games} meeting${o.games === 1 ? '' : 's'} · you're ${o.record}`;
        const gameLine = (g) => `${g.year} · Wk ${g.week} · ${g.my.toFixed(1)}–${g.opp.toFixed(1)}`;

        const mostLosses = [...opponents]
                .filter((o) => o.losses > 0)
                .sort((a, b) => b.losses - a.losses || a.winPct - b.winPct || a.ownerName.localeCompare(b.ownerName))[0];
        const mostWins = [...opponents]
                .filter((o) => o.wins > 0)
                .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || a.ownerName.localeCompare(b.ownerName))[0];
        const qualified = opponents.filter((o) => o.games >= 3);
        const worstPct = [...qualified]
                .filter((o) => o.winPct < 0.5)
                .sort((a, b) => a.winPct - b.winPct || b.games - a.games || a.ownerName.localeCompare(b.ownerName))[0];
        const bestPct = [...qualified]
                .filter((o) => o.winPct > 0.5)
                .sort((a, b) => b.winPct - a.winPct || b.games - a.games || a.ownerName.localeCompare(b.ownerName))[0];

        const awards = [];
        if (mostLosses) {
                awards.push({
                        owner: mostLosses.owner,
                        key: 'nemesis',
                        title: 'Nemesis',
                        emoji: '😈',
                        tagline: 'The one who owns you',
                        ownerName: mostLosses.ownerName,
                        stat: `${mostLosses.losses} loss${mostLosses.losses === 1 ? '' : 'es'}`,
                        sub: meetingsLabel(mostLosses)
                });
        }
        if (mostWins) {
                awards.push({
                        owner: mostWins.owner,
                        key: 'mybitch',
                        title: 'My Bitch',
                        emoji: '😏',
                        tagline: 'You simply own them',
                        ownerName: mostWins.ownerName,
                        stat: `${mostWins.wins} win${mostWins.wins === 1 ? '' : 's'}`,
                        sub: meetingsLabel(mostWins)
                });
        }
        if (worstPct && (!mostLosses || worstPct.owner !== mostLosses.owner)) {
                awards.push({
                        owner: worstPct.owner,
                        key: 'kryptonite',
                        title: 'Kryptonite',
                        emoji: '☠️',
                        tagline: "Can't buy a win",
                        ownerName: worstPct.ownerName,
                        stat: pct(worstPct),
                        sub: meetingsLabel(worstPct)
                });
        }
        if (bestPct && (!mostWins || bestPct.owner !== mostWins.owner)) {
                awards.push({
                        owner: bestPct.owner,
                        key: 'punchingbag',
                        title: 'Punching Bag',
                        emoji: '🥊',
                        tagline: 'Free win, every time',
                        ownerName: bestPct.ownerName,
                        stat: pct(bestPct),
                        sub: meetingsLabel(bestPct)
                });
        }
        if (closestLoss) {
                awards.push({
                        owner: closestLoss.owner,
                        key: 'heartbreaker',
                        title: 'Heartbreaker',
                        emoji: '💔',
                        tagline: 'Lost by a whisker',
                        ownerName: closestLoss.ownerName,
                        stat: `Lost by ${closestLoss.margin.toFixed(1)}`,
                        sub: gameLine(closestLoss)
                });
        }
        if (biggestWin) {
                awards.push({
                        owner: biggestWin.owner,
                        key: 'domination',
                        title: 'Total Domination',
                        emoji: '💥',
                        tagline: 'Biggest beatdown you dished out',
                        ownerName: biggestWin.ownerName,
                        stat: `Won by ${biggestWin.margin.toFixed(1)}`,
                        sub: gameLine(biggestWin)
                });
        }

        return { owner, ownerName, awards };
}
