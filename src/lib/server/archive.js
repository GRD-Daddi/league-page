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
