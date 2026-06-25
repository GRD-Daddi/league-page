import { query, getPool, initDb } from './db.js';
import { MAX_PICKS_PER_ROUND } from '$lib/utils/draftRules.js';

// Hard cap on how many team rows a single save may carry — guards against a
// malformed or oversized payload writing unbounded rows.
const MAX_TEAMS = 64;

// The upcoming draft runs this many rounds. Pick ownership is tracked per round.
export const DRAFT_ROUNDS = 15;

function clampPicks(value) {
        let n = parseInt(value, 10);
        if (!Number.isFinite(n) || n < 0) n = 0;
        if (n > MAX_PICKS_PER_ROUND) n = MAX_PICKS_PER_ROUND;
        return n;
}

/**
 * Returns the commissioner-maintained draft pick ownership for a season, grouped
 * by team. Each team has a `picks` array (one count per round) and a `total`.
 * Returns an empty team list when nothing has been saved yet.
 */
export async function getDraftPickOwnership(year) {
        if (!Number.isFinite(year)) return { rounds: DRAFT_ROUNDS, teams: [] };

        const { rows } = await query(
                `SELECT team_key, team_name, round, picks
                 FROM draft_pick_ownership
                 WHERE year = $1
                 ORDER BY team_name ASC NULLS LAST, team_key ASC, round ASC`,
                [year]
        );

        const byTeam = new Map();
        for (const r of rows) {
                if (!byTeam.has(r.team_key)) {
                        byTeam.set(r.team_key, {
                                teamKey: r.team_key,
                                teamName: r.team_name,
                                picks: new Array(DRAFT_ROUNDS).fill(0),
                                total: 0
                        });
                }
                const team = byTeam.get(r.team_key);
                const idx = r.round - 1;
                if (idx >= 0 && idx < DRAFT_ROUNDS) {
                        const n = Number(r.picks) || 0;
                        team.picks[idx] = n;
                        team.total += n;
                }
        }

        return { rounds: DRAFT_ROUNDS, teams: [...byTeam.values()] };
}

/**
 * Persists draft pick ownership for a season. `entries` is an array of
 * { teamKey, teamName, picks: number[] }. Each round cell is upserted in place so
 * re-saving updates rather than duplicating. Counts are clamped to a sane range.
 */
export async function saveDraftPickOwnership(year, entries) {
        if (!Number.isFinite(year) || !Array.isArray(entries)) return;

        // Normalize to a clean, deduplicated, bounded set of team rows before writing.
        const seen = new Set();
        const rows = [];
        for (const entry of entries) {
                const teamKey = (entry?.teamKey || '').toString().trim();
                if (!teamKey || seen.has(teamKey)) continue;
                seen.add(teamKey);
                const teamName = entry?.teamName ? entry.teamName.toString() : null;
                const picks = Array.isArray(entry?.picks) ? entry.picks : [];
                rows.push({
                        teamKey,
                        teamName,
                        picks: Array.from({ length: DRAFT_ROUNDS }, (_, i) => clampPicks(picks[i]))
                });
                if (rows.length >= MAX_TEAMS) break;
        }

        // Make the save authoritative for the year: replace all of that year's rows in
        // a single transaction so teams removed from the grid don't linger and render
        // on the public board.
        await initDb();
        const client = await getPool().connect();
        try {
                await client.query('BEGIN');
                await client.query('DELETE FROM draft_pick_ownership WHERE year = $1', [year]);
                for (const row of rows) {
                        for (let round = 1; round <= DRAFT_ROUNDS; round++) {
                                await client.query(
                                        `INSERT INTO draft_pick_ownership (year, team_key, team_name, round, picks, updated_at)
                                         VALUES ($1, $2, $3, $4, $5, now())`,
                                        [year, row.teamKey, row.teamName, round, row.picks[round - 1]]
                                );
                        }
                }
                await client.query('COMMIT');
        } catch (err) {
                await client.query('ROLLBACK');
                throw err;
        } finally {
                client.release();
        }
}
