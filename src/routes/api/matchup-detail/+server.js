import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db.js';
import { ownerDisplayName } from '$lib/utils/ownerNames.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { getYahooLeagueMatchups } from '$lib/yahoo-adapter/index.js';
import { loadPlayers } from '$lib/utils/helperFunctions/players.js';

/**
 * Per-matchup roster detail (full starting lineups + per-player scores) for a
 * single game in a single week. Powers the "drill into a matchup" expander on
 * the /matchups page.
 *
 * The durable archive only stores team totals (no player rows), so player-level
 * scores are fetched on demand from Yahoo's scoreboard for that season+week.
 * For past seasons the historical league key is derived from the archived
 * team_key (`nfl.l.<id>.t.<n>` -> `nfl.l.<id>`); for the live season we use the
 * authenticated client's current league key.
 */
export async function GET({ url, fetch, locals }) {
        if (!locals?.session?.userId) throw error(401, 'Login required');

        const year = parseInt(url.searchParams.get('year'), 10);
        const week = parseInt(url.searchParams.get('week'), 10);
        const matchupId = parseInt(url.searchParams.get('matchup'), 10);

        if (!Number.isFinite(year) || !Number.isFinite(week) || !Number.isFinite(matchupId)) {
                throw error(400, 'year, week and matchup are required');
        }

        // Archived team identity (names, owners, totals) + roster ids for this game.
        const { rows } = await query(
                `SELECT m.roster_id, m.team_key, m.team_name, m.points,
                        ts.manager_name AS owner
                 FROM matchup_archive m
                 LEFT JOIN team_season_archive ts ON ts.year = m.year AND ts.team_key = m.team_key
                 WHERE m.year = $1 AND m.week = $2 AND m.matchup_id = $3
                 ORDER BY m.points DESC NULLS LAST`,
                [year, week, matchupId]
        );

        if (rows.length < 2) throw error(404, 'Matchup not found in archive');

        const currentYear = getCurrentSeasonYear();
        let leagueKey = locals.leagueKey;
        if (year !== currentYear) {
                const teamKey = rows.find((r) => r.team_key)?.team_key;
                const derived = teamKey ? teamKey.replace(/\.t\.\d+$/, '') : null;
                if (!derived) throw error(404, 'Could not resolve league for that season');
                leagueKey = derived;
        }

        // Live Yahoo scoreboard for that league+week, plus player metadata.
        const [yahooMatchups, playersResult] = await Promise.all([
                getYahooLeagueMatchups(leagueKey, week, locals.yahooClient),
                loadPlayers(fetch)
        ]);

        // Bridge Yahoo player ids -> Sleeper-keyed player metadata via the `yh` field.
        const players = playersResult?.players ?? {};
        const byYahoo = {};
        for (const id in players) {
                const yh = players[id]?.yh;
                if (yh != null) byYahoo[String(yh)] = players[id];
        }

        const byRoster = new Map();
        for (const m of yahooMatchups || []) byRoster.set(m.roster_id, m);

        const yahooIdFromKey = (key) => {
                const s = String(key);
                const idx = s.indexOf('.p.');
                return idx === -1 ? s : s.slice(idx + 3);
        };

        const describePlayer = (key, pts) => {
                const meta = byYahoo[yahooIdFromKey(key)];
                let name = 'Unknown Player';
                let pos = null;
                let team = null;
                if (meta) {
                        pos = meta.pos ?? null;
                        team = meta.t ?? null;
                        name = pos === 'DEF' ? (meta.ln ?? 'Defense') : `${meta.fn ?? ''} ${meta.ln ?? ''}`.trim();
                        if (!name) name = 'Unknown Player';
                }
                return { name, pos, team, points: pts != null ? Number(pts) : 0 };
        };

        const buildSide = (archRow) => {
                const m = byRoster.get(archRow.roster_id);
                const starterKeys = m?.starters ?? [];
                const starterPts = m?.starters_points ?? [];
                const playersPoints = m?.players_points ?? {};

                const starters = starterKeys.map((key, i) =>
                        describePlayer(key, playersPoints[key]?.pts ?? starterPts[i] ?? 0)
                );

                const starterSet = new Set(starterKeys.map((k) => String(k)));
                const bench = (m?.players ?? [])
                        .filter((k) => !starterSet.has(String(k)))
                        .map((key) => describePlayer(key, playersPoints[key]?.pts ?? 0));

                return {
                        rosterId: archRow.roster_id,
                        teamName: archRow.team_name ?? 'Unknown',
                        ownerName: archRow.owner ? ownerDisplayName(archRow.owner) : null,
                        points: archRow.points != null ? Number(archRow.points) : null,
                        starters,
                        bench
                };
        };

        const home = buildSide(rows[0]);
        const away = buildSide(rows[1]);
        const hasPlayers = home.starters.length > 0 || away.starters.length > 0;

        return json({ year, week, matchupId, home, away, hasPlayers });
}
