import { query } from './db.js';
import { getCurrentSeasonYear } from './pot.js';
import { loadLeagueRostersWithFallback, loadLeagueUsers } from './dataLoaders.js';
import { getDraftPickOwnership, DRAFT_ROUNDS } from './draftPicks.js';
import { getDraftResultsArchive, getTransactionArchive, playerIdFromKey } from './keeperArchive.js';
import { computeKeepers } from './keeperEngine.js';

/**
 * Orchestrates the keeper engine: loads current rosters, persisted draft +
 * transaction history and the upcoming draft's pick-ownership board, runs the
 * rules engine, and overlays manager-submitted selections. Also provides the
 * selection CRUD + commissioner approval helpers.
 *
 * Pick-availability note: the draft_pick_ownership board RESETS between the
 * preseason and the regular season, so keeper pick availability is always
 * evaluated against the UPCOMING draft year's board, never a stale one.
 */

export async function getKeeperSelections(year) {
        const { rows } = await query(
                `SELECT year, team_key, roster_id, player_key, player_id, player_name,
                        cost_round, acquisition_year, status, submitted_by, updated_at
                 FROM keeper_selections
                 WHERE year = $1
                 ORDER BY team_key ASC, cost_round ASC`,
                [year]
        );
        return rows;
}

export async function getApprovedKeepers(year) {
        const { rows } = await query(
                `SELECT year, team_key, roster_id, player_key, player_id, player_name, cost_round, acquisition_year
                 FROM keeper_selections
                 WHERE year = $1 AND status = 'approved'
                 ORDER BY team_key ASC, cost_round ASC`,
                [year]
        );
        return rows;
}

/**
 * Full keeper state for the upcoming draft: every team with its rostered players'
 * eligibility, merged with current selection status, plus per-team pick
 * consumption so the UI can show remaining keeper capacity per round.
 */
export async function getKeeperState(year, yahooClient, leagueKey) {
        const upcomingYear = Number.isFinite(year) ? year : getCurrentSeasonYear();

        const [rostersResult, users, drafts, transactions, pickOwnership, selections] = await Promise.all([
                loadLeagueRostersWithFallback(yahooClient, leagueKey).catch((e) => {
                        console.error('[keepers] roster load failed:', e?.message);
                        return null;
                }),
                loadLeagueUsers(yahooClient, leagueKey).catch(() => []),
                getDraftResultsArchive().catch(() => []),
                getTransactionArchive().catch(() => []),
                getDraftPickOwnership(upcomingYear).catch(() => ({ rounds: DRAFT_ROUNDS, teams: [] })),
                getKeeperSelections(upcomingYear).catch(() => [])
        ]);

        const requiresAuth = rostersResult === null;
        const rostersMap = rostersResult?.rosters || {};

        // team_key -> manager nickname (from league users) for display.
        const managerByTeam = new Map();
        for (const u of users || []) {
                const tk = u?.metadata?.team_key;
                if (tk) managerByTeam.set(tk, u?.metadata?.manager_nickname || u?.display_name || null);
        }

        const teams = computeKeepers({ drafts, transactions, rostersMap, upcomingYear, pickOwnership });

        // Index selections by team+player and tally per-team picks consumed by round.
        const selByTeamPlayer = new Map();
        const consumedByTeamRound = new Map(); // teamKey -> Map(round -> count)
        for (const s of selections) {
                selByTeamPlayer.set(`${s.team_key}::${s.player_key}`, s);
                if (!consumedByTeamRound.has(s.team_key)) consumedByTeamRound.set(s.team_key, new Map());
                const m = consumedByTeamRound.get(s.team_key);
                m.set(s.cost_round, (m.get(s.cost_round) || 0) + 1);
        }

        for (const team of teams) {
                team.manager = managerByTeam.get(team.teamKey) || null;
                const consumed = consumedByTeamRound.get(team.teamKey) || new Map();
                team.selectedCount = 0;
                team.approvedCount = 0;

                for (const p of team.players) {
                        const sel = selByTeamPlayer.get(`${team.teamKey}::${p.playerKey}`);
                        p.selected = !!sel;
                        p.status = sel?.status || null;
                        if (sel) {
                                team.selectedCount++;
                                if (sel.status === 'approved') team.approvedCount++;
                        }
                        // A pick is available for a NOT-yet-selected player when the team owns
                        // more picks in that round than it has already committed to keepers.
                        const usedInRound = consumed.get(p.costRound) || 0;
                        const remainingInRound = p.ownedPicksInRound - usedInRound + (p.selected ? 1 : 0);
                        p.pickAvailable = remainingInRound > 0;
                        // Effective selectability for a manager picking right now.
                        p.canSelect = !!p.eligibleByRules && (p.selected || p.pickAvailable);
                }
        }

        // Annotate each persisted selection with LIVE validity so the commissioner
        // can see (and the approval path can enforce) whether a locked-in pick is
        // still legal after the data has been refreshed. `issues` block approval;
        // `warnings` are advisory only.
        const evalByTeamPlayer = new Map();
        for (const team of teams) {
                for (const p of team.players) evalByTeamPlayer.set(`${team.teamKey}::${p.playerKey}`, p);
        }
        for (const s of selections) {
                if (requiresAuth) {
                        s.valid = null; // cannot validate without live rosters
                        s.issues = [];
                        s.warnings = [];
                        continue;
                }
                const issues = [];
                const warnings = [];
                const ev = evalByTeamPlayer.get(`${s.team_key}::${s.player_key}`);
                if (!ev) {
                        issues.push('Player is no longer on this roster');
                } else {
                        if (!ev.eligibleByRules) issues.push('No longer keeper-eligible (max seasons reached)');
                        else if (!ev.pickAvailable) issues.push(`No available pick in round ${ev.costRound}`);
                        if (ev.needsReview) warnings.push('Acquisition history needs review');
                        if (Number(s.cost_round) !== Number(ev.costRound)) {
                                warnings.push(`Keeper cost changed R${s.cost_round} \u2192 R${ev.costRound}`);
                        }
                }
                s.issues = issues;
                s.warnings = warnings;
                s.valid = issues.length === 0;
        }

        return {
                upcomingYear,
                requiresAuth,
                fromSeason: rostersResult?.fromSeason || null,
                teams,
                pickOwnership,
                selections,
                rounds: pickOwnership?.rounds || DRAFT_ROUNDS
        };
}

/**
 * Server-authoritative keeper selection. Re-derives eligibility from the live
 * state (never trusts the client) before persisting. Returns { ok, error }.
 */
export async function saveKeeperSelection({ year, teamKey, playerKey, submittedBy, yahooClient, leagueKey }) {
        if (!teamKey || !playerKey) return { ok: false, error: 'Missing team or player.' };

        const state = await getKeeperState(year, yahooClient, leagueKey);
        if (state.requiresAuth) return { ok: false, error: 'Yahoo login is required.' };

        const team = state.teams.find((t) => t.teamKey === teamKey);
        if (!team) return { ok: false, error: 'Team not found in the league.' };

        const player = team.players.find((p) => p.playerKey === playerKey);
        if (!player) return { ok: false, error: 'Player is not on this team\u2019s roster.' };
        if (player.selected) return { ok: true }; // already selected — idempotent
        if (!player.eligibleByRules) return { ok: false, error: 'Player is not keeper-eligible (3-season limit reached).' };
        if (!player.pickAvailable) {
                return { ok: false, error: `No available pick in round ${player.costRound} for this keeper.` };
        }

        await query(
                `INSERT INTO keeper_selections
                        (year, team_key, roster_id, player_key, player_id, player_name, cost_round, acquisition_year, status, submitted_by, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9, now())
                 ON CONFLICT (year, team_key, player_key) DO UPDATE SET
                        roster_id = EXCLUDED.roster_id, player_name = EXCLUDED.player_name,
                        cost_round = EXCLUDED.cost_round, acquisition_year = EXCLUDED.acquisition_year,
                        submitted_by = EXCLUDED.submitted_by, updated_at = now()`,
                [
                        state.upcomingYear,
                        teamKey,
                        team.rosterId,
                        playerKey,
                        player.playerId || playerIdFromKey(playerKey),
                        player.name,
                        player.costRound,
                        player.acquisitionYear,
                        submittedBy || null
                ]
        );
        return { ok: true };
}

export async function removeKeeperSelection(year, teamKey, playerKey) {
        if (!teamKey || !playerKey) return { ok: false, error: 'Missing team or player.' };
        await query(
                `DELETE FROM keeper_selections WHERE year = $1 AND team_key = $2 AND player_key = $3`,
                [year, teamKey, playerKey]
        );
        return { ok: true };
}

export async function setKeeperStatus(year, teamKey, playerKey, status) {
        const next = status === 'approved' ? 'approved' : 'pending';
        await query(
                `UPDATE keeper_selections SET status = $4, updated_at = now()
                 WHERE year = $1 AND team_key = $2 AND player_key = $3`,
                [year, teamKey, playerKey, next]
        );
        return { ok: true };
}

export async function setAllKeeperStatus(year, status) {
        const next = status === 'approved' ? 'approved' : 'pending';
        await query(
                `UPDATE keeper_selections SET status = $2, updated_at = now() WHERE year = $1`,
                [year, next]
        );
        return { ok: true };
}

/**
 * Commissioner approval for a single keeper. Re-runs the rules engine against
 * the LIVE state before approving so a selection that has since become illegal
 * (player dropped/traded, eligibility exhausted, pick no longer owned) cannot be
 * rubber-stamped. Reverting to 'pending' never re-validates.
 */
export async function approveKeeper(year, teamKey, playerKey, status, { yahooClient, leagueKey } = {}) {
        if (status !== 'approved') {
                return setKeeperStatus(year, teamKey, playerKey, 'pending');
        }
        const state = await getKeeperState(year, yahooClient, leagueKey);
        if (state.requiresAuth) return { ok: false, error: 'Yahoo login is required to validate keepers.' };

        const sel = state.selections.find((s) => s.team_key === teamKey && s.player_key === playerKey);
        if (!sel) return { ok: false, error: 'Keeper selection not found.' };
        if (sel.valid === false) {
                return { ok: false, error: `Cannot approve — ${sel.issues.join('; ')}.` };
        }
        return setKeeperStatus(year, teamKey, playerKey, 'approved');
}

/**
 * Bulk approval that re-validates every pending selection and only approves the
 * still-legal ones. Returns the list of skipped (invalid) selections so the
 * commissioner can see exactly what was held back and why.
 */
export async function approveAllKeepers(year, { yahooClient, leagueKey } = {}) {
        const state = await getKeeperState(year, yahooClient, leagueKey);
        if (state.requiresAuth) return { ok: false, error: 'Yahoo login is required to validate keepers.' };

        const valid = state.selections.filter((s) => s.valid !== false);
        const skipped = state.selections.filter((s) => s.valid === false);

        for (const s of valid) {
                await setKeeperStatus(year, s.team_key, s.player_key, 'approved');
        }
        return {
                ok: true,
                approvedCount: valid.length,
                skipped: skipped.map((s) => ({
                        teamKey: s.team_key,
                        playerName: s.player_name,
                        issues: s.issues || []
                }))
        };
}
