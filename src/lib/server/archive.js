import { query } from './db.js';

/**
 * Durable league history helpers. These read/write the league's OWN copy of
 * season results (season_archive / team_season_archive) so historical facts —
 * who won, final standings — survive even if the Yahoo API becomes unavailable
 * or a past league is deleted. Yahoo remains the source of truth while it's up;
 * the archive is the safety net everything else builds on.
 */

/**
 * Archived champions ordered oldest-first. Used for "person to beat" and
 * back-to-back streak detection without depending on a live Yahoo call.
 */
export async function getArchivedChampions() {
        const { rows } = await query(
                `SELECT year, champion_team_key, champion_name
                 FROM season_archive
                 WHERE champion_name IS NOT NULL
                 ORDER BY year ASC`
        );
        return rows.map((r) => ({
                year: r.year,
                teamKey: r.champion_team_key,
                name: r.champion_name
        }));
}

/**
 * All archived seasons, newest-first (header rows). For history/admin views.
 */
export async function getArchivedSeasons() {
        const { rows } = await query('SELECT * FROM season_archive ORDER BY year DESC');
        return rows;
}

/**
 * Persists a season's podium (top three finishers) into the durable archive.
 * Idempotent: upserts by year and only fills columns from the data provided,
 * never wiping previously-captured values with nulls (COALESCE keeps the old
 * value when the new one is missing). Safe to call on every authenticated load.
 */
export async function snapshotPodium(year, podium, meta = {}) {
        if (!Number.isFinite(year) || !Array.isArray(podium) || podium.length === 0) return;

        const byPlace = new Map(podium.map((p) => [p.place, p]));
        const first = byPlace.get(1) || null;
        const second = byPlace.get(2) || null;
        const third = byPlace.get(3) || null;

        await query(
                `INSERT INTO season_archive
                         (year, league_key, league_name, status, num_teams,
                          champion_team_key, champion_name,
                          runner_up_team_key, runner_up_name,
                          third_team_key, third_name, captured_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
                 ON CONFLICT (year) DO UPDATE SET
                         league_key = COALESCE(EXCLUDED.league_key, season_archive.league_key),
                         league_name = COALESCE(EXCLUDED.league_name, season_archive.league_name),
                         status = COALESCE(EXCLUDED.status, season_archive.status),
                         num_teams = COALESCE(EXCLUDED.num_teams, season_archive.num_teams),
                         champion_team_key = COALESCE(EXCLUDED.champion_team_key, season_archive.champion_team_key),
                         champion_name = COALESCE(EXCLUDED.champion_name, season_archive.champion_name),
                         runner_up_team_key = COALESCE(EXCLUDED.runner_up_team_key, season_archive.runner_up_team_key),
                         runner_up_name = COALESCE(EXCLUDED.runner_up_name, season_archive.runner_up_name),
                         third_team_key = COALESCE(EXCLUDED.third_team_key, season_archive.third_team_key),
                         third_name = COALESCE(EXCLUDED.third_name, season_archive.third_name),
                         captured_at = now()`,
                [
                        year,
                        meta.leagueKey || null,
                        meta.leagueName || null,
                        meta.status || null,
                        Number.isFinite(meta.numTeams) ? meta.numTeams : null,
                        first?.teamKey || null,
                        first?.name || null,
                        second?.teamKey || null,
                        second?.name || null,
                        third?.teamKey || null,
                        third?.name || null
                ]
        );

        for (const p of podium) {
                // team_season_archive is keyed by (year, team_key); skip entries that
                // lack a real Yahoo team key rather than fabricate one.
                if (!p?.teamKey) continue;
                await query(
                        `INSERT INTO team_season_archive
                                 (year, team_key, team_name, logo_url, final_rank, captured_at)
                         VALUES ($1, $2, $3, $4, $5, now())
                         ON CONFLICT (year, team_key) DO UPDATE SET
                                 team_name = COALESCE(EXCLUDED.team_name, team_season_archive.team_name),
                                 logo_url = COALESCE(EXCLUDED.logo_url, team_season_archive.logo_url),
                                 final_rank = COALESCE(EXCLUDED.final_rank, team_season_archive.final_rank),
                                 captured_at = now()`,
                        [year, p.teamKey, p.name || null, p.logo || null, Number.isFinite(p.place) ? p.place : null]
                );
        }
}

const num = (v) => {
        const n = typeof v === 'number' ? v : parseFloat(v);
        return Number.isFinite(n) ? n : null;
};
const int = (v) => {
        const n = typeof v === 'number' ? v : parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
};

/**
 * Upserts the season_archive header (league identity, status, team count) without
 * touching the podium columns. Lets us record a season's existence/metadata even
 * when the podium isn't resolvable yet. Idempotent (COALESCE keeps old non-nulls).
 */
export async function snapshotSeasonHeader(year, meta = {}) {
        if (!Number.isFinite(year)) return;
        await query(
                `INSERT INTO season_archive (year, league_key, league_name, status, num_teams, captured_at)
                 VALUES ($1, $2, $3, $4, $5, now())
                 ON CONFLICT (year) DO UPDATE SET
                         league_key = COALESCE(EXCLUDED.league_key, season_archive.league_key),
                         league_name = COALESCE(EXCLUDED.league_name, season_archive.league_name),
                         status = COALESCE(EXCLUDED.status, season_archive.status),
                         num_teams = COALESCE(EXCLUDED.num_teams, season_archive.num_teams),
                         captured_at = now()`,
                [year, meta.leagueKey || null, meta.leagueName || null, meta.status || null, int(meta.numTeams)]
        );
}

/**
 * Persists every team's full final standing for a season (not just the podium):
 * rank, W/L/T, points for/against, playoff seed. Idempotent — fresh non-null
 * values overwrite, nulls preserve — so it can run on every authenticated load
 * and keep the current season's row current as the season progresses.
 */
export async function snapshotStandings(year, teams) {
        if (!Number.isFinite(year) || !Array.isArray(teams)) return;
        for (const t of teams) {
                if (!t?.teamKey) continue;
                await query(
                        `INSERT INTO team_season_archive
                                 (year, team_key, team_name, manager_name, logo_url,
                                  final_rank, wins, losses, ties, points_for, points_against,
                                  playoff_seed, captured_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
                         ON CONFLICT (year, team_key) DO UPDATE SET
                                 team_name = COALESCE(EXCLUDED.team_name, team_season_archive.team_name),
                                 manager_name = COALESCE(EXCLUDED.manager_name, team_season_archive.manager_name),
                                 logo_url = COALESCE(EXCLUDED.logo_url, team_season_archive.logo_url),
                                 final_rank = COALESCE(EXCLUDED.final_rank, team_season_archive.final_rank),
                                 wins = COALESCE(EXCLUDED.wins, team_season_archive.wins),
                                 losses = COALESCE(EXCLUDED.losses, team_season_archive.losses),
                                 ties = COALESCE(EXCLUDED.ties, team_season_archive.ties),
                                 points_for = COALESCE(EXCLUDED.points_for, team_season_archive.points_for),
                                 points_against = COALESCE(EXCLUDED.points_against, team_season_archive.points_against),
                                 playoff_seed = COALESCE(EXCLUDED.playoff_seed, team_season_archive.playoff_seed),
                                 captured_at = now()`,
                        [
                                year,
                                t.teamKey,
                                t.teamName || null,
                                t.managerName || null,
                                t.logoUrl || null,
                                int(t.finalRank),
                                int(t.wins),
                                int(t.losses),
                                int(t.ties),
                                num(t.pointsFor),
                                num(t.pointsAgainst),
                                int(t.playoffSeed)
                        ]
                );
        }
}

/**
 * Persists each team's final roster (player detail array). Only overwrites the
 * stored players when the incoming roster actually has players, so an empty
 * pre-draft fetch never wipes a previously-captured squad.
 */
export async function snapshotRosters(year, rosters) {
        if (!Number.isFinite(year) || !Array.isArray(rosters)) return;
        for (const r of rosters) {
                if (!r?.teamKey) continue;
                const players = Array.isArray(r.players) ? r.players : [];
                await query(
                        `INSERT INTO roster_archive
                                 (year, team_key, roster_id, team_name, manager_name, logo_url, players, captured_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, now())
                         ON CONFLICT (year, team_key) DO UPDATE SET
                                 roster_id = COALESCE(EXCLUDED.roster_id, roster_archive.roster_id),
                                 team_name = COALESCE(EXCLUDED.team_name, roster_archive.team_name),
                                 manager_name = COALESCE(EXCLUDED.manager_name, roster_archive.manager_name),
                                 logo_url = COALESCE(EXCLUDED.logo_url, roster_archive.logo_url),
                                 players = CASE
                                         WHEN jsonb_array_length(EXCLUDED.players) > 0 THEN EXCLUDED.players
                                         ELSE roster_archive.players
                                 END,
                                 captured_at = now()`,
                        [
                                year,
                                r.teamKey,
                                int(r.rosterId),
                                r.teamName || null,
                                r.managerName || null,
                                r.logoUrl || null,
                                JSON.stringify(players)
                        ]
                );
        }
}

/**
 * Persists every matchup score for a season, one row per team-side. Idempotent
 * by (year, week, matchup_id, roster_id) so re-runs update in place.
 */
export async function snapshotMatchups(year, sides) {
        if (!Number.isFinite(year) || !Array.isArray(sides)) return;
        for (const s of sides) {
                const week = int(s?.week);
                const matchupId = int(s?.matchupId);
                const rosterId = int(s?.rosterId);
                if (week === null || matchupId === null || rosterId === null) continue;
                await query(
                        `INSERT INTO matchup_archive
                                 (year, week, matchup_id, roster_id, team_key, team_name, points, is_playoffs, captured_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
                         ON CONFLICT (year, week, matchup_id, roster_id) DO UPDATE SET
                                 team_key = COALESCE(EXCLUDED.team_key, matchup_archive.team_key),
                                 team_name = COALESCE(EXCLUDED.team_name, matchup_archive.team_name),
                                 points = COALESCE(EXCLUDED.points, matchup_archive.points),
                                 is_playoffs = EXCLUDED.is_playoffs,
                                 captured_at = now()`,
                        [year, week, matchupId, rosterId, s.teamKey || null, s.teamName || null, num(s.points), !!s.isPlayoffs]
                );
        }
}

/**
 * Derives a season's standings + rosters from a loaded rosters map (the Yahoo
 * roster payload carries each team's record, seed and player detail) and writes
 * them to the archive. Pure transform over already-loaded data — no Yahoo calls.
 * `matchupWeeks` (from loadMatchupData) is optional; when present its scores are
 * archived too, with roster_id mapped to team identity from the same rosters map.
 */
export async function captureSeason(year, { leagueData = null, rostersResult = null, matchupWeeks = null, playoffsStart = null } = {}) {
        if (!Number.isFinite(year)) return;

        const rosters = rostersResult?.rosters ? Object.values(rostersResult.rosters) : [];

        await snapshotSeasonHeader(year, {
                leagueKey: leagueData?.league_id || null,
                leagueName: leagueData?.name || null,
                status: leagueData?.status || null,
                numTeams: int(leagueData?.settings?.num_teams) ?? (rosters.length || null)
        });

        // roster_id -> { teamKey, teamName } so matchup sides can carry identity.
        const idToTeam = new Map();

        const standings = [];
        const rosterRows = [];
        for (const r of rosters) {
                const teamKey = r?.metadata?.team_key || null;
                const teamName = r?.metadata?.team_name || null;
                if (Number.isFinite(int(r?.roster_id))) {
                        idToTeam.set(int(r.roster_id), { teamKey, teamName });
                }
                if (!teamKey) continue;

                standings.push({
                        teamKey,
                        teamName,
                        logoUrl: r?.metadata?.team_logo || null,
                        finalRank: r?.metadata?.rank,
                        playoffSeed: r?.metadata?.playoff_seed,
                        wins: r?.settings?.wins,
                        losses: r?.settings?.losses,
                        ties: r?.settings?.ties,
                        pointsFor: r?.settings?.fpts,
                        pointsAgainst: r?.settings?.fpts_against
                });

                const detail = r?.players_detail || {};
                const starterSet = new Set(r?.starters || []);
                const players = (r?.players || []).map((key) => {
                        const d = detail[key] || {};
                        return {
                                key,
                                fn: d.fn ?? null,
                                ln: d.ln ?? null,
                                pos: d.pos ?? null,
                                t: d.t ?? null,
                                img: d.img ?? null,
                                starter: starterSet.has(key)
                        };
                });
                rosterRows.push({
                        teamKey,
                        rosterId: r?.roster_id,
                        teamName,
                        logoUrl: r?.metadata?.team_logo || null,
                        players
                });
        }

        await snapshotStandings(year, standings);
        await snapshotRosters(year, rosterRows);

        if (Array.isArray(matchupWeeks) && matchupWeeks.length) {
                const sides = [];
                for (const wk of matchupWeeks) {
                        const week = int(wk?.week);
                        const isPlayoffs = Number.isFinite(int(playoffsStart)) && week !== null
                                ? week >= int(playoffsStart)
                                : false;
                        for (const matchup of wk?.matchups || []) {
                                for (const side of matchup || []) {
                                        const team = idToTeam.get(int(side?.roster_id)) || {};
                                        sides.push({
                                                week,
                                                matchupId: side?.matchup_id,
                                                rosterId: side?.roster_id,
                                                teamKey: team.teamKey || null,
                                                teamName: team.teamName || null,
                                                points: side?.points,
                                                isPlayoffs
                                        });
                                }
                        }
                }
                await snapshotMatchups(year, sides);
        }
}

/** Archived per-team standings for a season, best rank first. */
export async function getArchivedStandings(year) {
        if (!Number.isFinite(year)) return [];
        const { rows } = await query(
                `SELECT * FROM team_season_archive
                 WHERE year = $1
                 ORDER BY final_rank ASC NULLS LAST, points_for DESC NULLS LAST`,
                [year]
        );
        return rows;
}

/** Archived final rosters for a season. */
export async function getArchivedRosters(year) {
        if (!Number.isFinite(year)) return [];
        const { rows } = await query(
                `SELECT * FROM roster_archive WHERE year = $1 ORDER BY team_name ASC NULLS LAST`,
                [year]
        );
        return rows;
}

/** Archived matchup scores for a season, ordered by week then matchup. */
export async function getArchivedMatchups(year) {
        if (!Number.isFinite(year)) return [];
        const { rows } = await query(
                `SELECT * FROM matchup_archive
                 WHERE year = $1
                 ORDER BY week ASC, matchup_id ASC, points DESC NULLS LAST`,
                [year]
        );
        return rows;
}
