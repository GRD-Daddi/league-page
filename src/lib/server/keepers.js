import { query } from './db.js';
import { getCurrentSeasonYear, getSettings } from './pot.js';
import { loadLeagueRostersWithFallback, loadLeagueUsers } from './dataLoaders.js';
import { getDraftPickOwnership, DRAFT_ROUNDS } from './draftPicks.js';
import { getDraftResultsArchive, getTransactionArchive, playerIdFromKey } from './keeperArchive.js';
import { computeKeepers } from './keeperEngine.js';

// Normalize a team name for cross-season owner bridging (case/space-insensitive).
// Returns '' for empty/missing names so they never produce a spurious match.
function normalizeTeamName(name) {
        return (name || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

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
 * Pure helper: given the approved keepers and the (new) pick-ownership board,
 * return the keepers that would be left WITHOUT a pick in their cost round —
 * i.e. rounds where the team now owns fewer picks than it has approved keepers
 * costing that round. When a round is over-subscribed, EVERY approved keeper in
 * that round is flagged (the whole round must be re-approved against the new
 * distribution, since the commissioner — not the manager — chooses which keeper
 * survives the lost pick). No DB access, so it is unit-testable in isolation.
 */
export function computeOrphanedApprovedKeepers(approved, pickOwnership) {
        // teamKey -> Map(round -> owned picks) from the board.
        const ownedByTeamRound = new Map();
        for (const team of pickOwnership?.teams || []) {
                const m = new Map();
                (team.picks || []).forEach((n, i) => m.set(i + 1, Number(n) || 0));
                ownedByTeamRound.set(team.teamKey, m);
        }

        // Group approved keepers by team + cost round.
        const byTeamRound = new Map(); // `${teamKey}::${round}` -> selections[]
        for (const k of approved || []) {
                const round = Number(k.cost_round);
                if (!Number.isFinite(round)) continue;
                const key = `${k.team_key}::${round}`;
                if (!byTeamRound.has(key)) byTeamRound.set(key, []);
                byTeamRound.get(key).push(k);
        }

        const orphaned = [];
        for (const [key, list] of byTeamRound) {
                const [teamKey, roundStr] = key.split('::');
                const round = Number(roundStr);
                const owned = ownedByTeamRound.get(teamKey)?.get(round) ?? 0;
                if (list.length > owned) {
                        for (const k of list) {
                                orphaned.push({
                                        teamKey: k.team_key,
                                        playerKey: k.player_key,
                                        playerName: k.player_name,
                                        round,
                                        owned,
                                        approved: list.length
                                });
                        }
                }
        }
        return orphaned;
}

/**
 * Reconciles approved keepers against a freshly-saved pick-ownership board:
 * any approved keeper left without a pick in its cost round is reverted to
 * 'pending' so the draft board can never render a negative/over-limit state from
 * an orphaned keeper. Returns the list of reverted keepers so the commissioner
 * can be told exactly which keepers were affected and why.
 */
export async function reconcileApprovedKeepersWithPicks(year, pickOwnership) {
        const approved = await getApprovedKeepers(year);
        const orphaned = computeOrphanedApprovedKeepers(approved, pickOwnership);
        for (const k of orphaned) {
                await setKeeperStatus(year, k.teamKey, k.playerKey, 'pending');
        }
        return orphaned;
}

/**
 * Full keeper state for the upcoming draft: every team with its rostered players'
 * eligibility, merged with current selection status, plus per-team pick
 * consumption so the UI can show remaining keeper capacity per round.
 */
export async function getKeeperState(year, yahooClient, leagueKey, viewerKey = null) {
        const upcomingYear = Number.isFinite(year) ? year : getCurrentSeasonYear();

        const [rostersResult, users, drafts, transactions, pickOwnership, selections, settings] = await Promise.all([
                loadLeagueRostersWithFallback(yahooClient, leagueKey, viewerKey).catch((e) => {
                        console.error('[keepers] roster load failed:', e?.message);
                        return null;
                }),
                loadLeagueUsers(yahooClient, leagueKey, viewerKey).catch(() => []),
                getDraftResultsArchive().catch(() => []),
                getTransactionArchive().catch(() => []),
                getDraftPickOwnership(upcomingYear).catch(() => ({ rounds: DRAFT_ROUNDS, teams: [] })),
                getKeeperSelections(upcomingYear).catch(() => []),
                getSettings().catch(() => ({ maxKeepers: 2 }))
        ]);

        // League-wide cap on how many players a team may keep (commissioner setting).
        const maxKeepers = Math.max(1, Math.round(Number(settings?.maxKeepers) || 2));

        const requiresAuth = rostersResult === null;
        const rostersMap = rostersResult?.rosters || {};

        // team_key -> manager nickname / team name (from the CURRENT league users) for display.
        const managerByTeam = new Map();
        const nameByTeam = new Map();
        // Canonical owner identity (yahoo_guid) -> the upcoming league's team_key, plus
        // a normalized-team-name index used to bridge HIDDEN managers (no GUID).
        const currentKeyByGuid = new Map();
        const currentKeyByName = new Map();
        const dupNames = new Set();
        for (const u of users || []) {
                const tk = u?.metadata?.team_key;
                if (!tk) continue;
                managerByTeam.set(tk, u?.metadata?.manager_nickname || u?.display_name || null);
                if (u?.metadata?.team_name) nameByTeam.set(tk, u.metadata.team_name);
                const guid = u?.metadata?.yahoo_guid;
                if (guid) currentKeyByGuid.set(guid, tk);
                const nm = normalizeTeamName(u?.metadata?.team_name);
                if (nm) {
                        if (currentKeyByName.has(nm)) dupNames.add(nm);
                        else currentKeyByName.set(nm, tk);
                }
        }
        // Ambiguous (duplicated) names can't disambiguate an owner, so drop them.
        for (const nm of dupNames) currentKeyByName.delete(nm);

        // Yahoo issues a NEW league key (and reshuffles .t.N team numbers) every
        // season, so during the preseason the engine falls back to last season's
        // rosters whose team_keys differ from the upcoming league's. Pick ownership
        // and selections live under the upcoming keys, so bridge each fallback roster
        // to its upcoming-season franchise. Primary key is the owner GUID (the app's
        // canonical cross-season identity); for hidden managers (no GUID) fall back to
        // an unambiguous team-name match so their team isn't left broken.
        const teamKeyRemap = new Map();
        const claimedKeys = new Set();
        const rosterIds = Object.keys(rostersMap || {});
        // Pass 1: match by owner GUID.
        for (const rid of rosterIds) {
                const r = rostersMap[rid];
                const rawKey = r?.metadata?.team_key;
                const ownerGuid = r?.owner_id; // guid when visible, else that season's team_key
                if (!rawKey) continue;
                const currentKey = ownerGuid ? currentKeyByGuid.get(ownerGuid) : null;
                if (!currentKey) continue;
                claimedKeys.add(currentKey);
                if (currentKey !== rawKey) teamKeyRemap.set(rawKey, currentKey);
        }
        // Pass 2: bridge the remaining (hidden-manager) rosters by unambiguous name.
        for (const rid of rosterIds) {
                const r = rostersMap[rid];
                const rawKey = r?.metadata?.team_key;
                if (!rawKey || teamKeyRemap.has(rawKey)) continue;
                const nm = normalizeTeamName(r?.metadata?.team_name);
                const currentKey = nm ? currentKeyByName.get(nm) : null;
                if (currentKey && currentKey !== rawKey && !claimedKeys.has(currentKey)) {
                        claimedKeys.add(currentKey);
                        teamKeyRemap.set(rawKey, currentKey);
                }
        }

        const teams = computeKeepers({ drafts, transactions, rostersMap, upcomingYear, pickOwnership, teamKeyRemap });

        // Index selections by team+player and tally per-team picks consumed by round.
        // Track all selections and approved-only separately: the draft board and
        // commissioner warnings care about APPROVED keepers (what will actually
        // break the board), while live selectability counts everything committed.
        const selByTeamPlayer = new Map();
        const consumedByTeamRound = new Map(); // teamKey -> Map(round -> count) — all selections
        const approvedByTeamRound = new Map(); // teamKey -> Map(round -> count) — approved only
        for (const s of selections) {
                selByTeamPlayer.set(`${s.team_key}::${s.player_key}`, s);
                if (!consumedByTeamRound.has(s.team_key)) consumedByTeamRound.set(s.team_key, new Map());
                const m = consumedByTeamRound.get(s.team_key);
                m.set(s.cost_round, (m.get(s.cost_round) || 0) + 1);
                if (s.status === 'approved') {
                        if (!approvedByTeamRound.has(s.team_key)) approvedByTeamRound.set(s.team_key, new Map());
                        const am = approvedByTeamRound.get(s.team_key);
                        am.set(s.cost_round, (am.get(s.cost_round) || 0) + 1);
                }
        }

        for (const team of teams) {
                team.manager = managerByTeam.get(team.teamKey) || null;
                // Prefer the upcoming league's team name (rosters may come from a
                // fallback season whose name has since changed).
                if (nameByTeam.has(team.teamKey)) team.teamName = nameByTeam.get(team.teamKey);
                const consumed = consumedByTeamRound.get(team.teamKey) || new Map();
                team.selectedCount = 0;
                team.approvedCount = 0;
                // Total keepers already committed across all rounds — drives the per-team cap.
                const totalSelected = [...consumed.values()].reduce((a, b) => a + b, 0);
                team.keeperLimit = maxKeepers;
                team.atLimit = totalSelected >= maxKeepers;

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
                        // A not-yet-selected, otherwise-keepable player is blocked when the team
                        // has already hit its keeper cap. Selected players are never "blocked".
                        p.blockedByLimit = !p.selected && !!p.eligibleByRules && p.pickAvailable && totalSelected >= maxKeepers;
                        // Effective selectability for a manager picking right now.
                        p.canSelect = !!p.eligibleByRules && (p.selected || (p.pickAvailable && !p.blockedByLimit));
                }

                // Per-round over-subscription: each keeper consumes its cost-round pick,
                // so if more keepers cost a round than the team owns picks in it, the
                // draft board goes negative. Surface every conflicting round so the UI
                // can warn managers/commissioners (separate from per-selection issues).
                const approved = approvedByTeamRound.get(team.teamKey) || new Map();
                const rounds = new Set([...consumed.keys(), ...approved.keys()]);
                team.roundConflicts = [];
                for (const round of rounds) {
                        const owned = Number(team.picks?.[round - 1]) || 0;
                        const selectedInRound = consumed.get(round) || 0;
                        const approvedInRound = approved.get(round) || 0;
                        const overSelected = selectedInRound > owned;
                        const overApproved = approvedInRound > owned;
                        if (overSelected || overApproved) {
                                team.roundConflicts.push({
                                        round,
                                        owned,
                                        selected: selectedInRound,
                                        approved: approvedInRound,
                                        overSelected,
                                        overApproved
                                });
                        }
                }
                team.roundConflicts.sort((a, b) => a.round - b.round);
                team.hasRoundConflict = team.roundConflicts.length > 0;
                team.hasApprovedConflict = team.roundConflicts.some((c) => c.overApproved);
        }

        // Annotate each persisted selection with LIVE validity so the commissioner
        // can see (and the approval path can enforce) whether a locked-in pick is
        // still legal after the data has been refreshed. `issues` block approval;
        // `warnings` are advisory only.
        const evalByTeamPlayer = new Map();
        for (const team of teams) {
                for (const p of team.players) evalByTeamPlayer.set(`${team.teamKey}::${p.playerKey}`, p);
        }

        // Per-team keeper cap: when a team has more selections than the configured
        // max (selections predate the cap, or the commissioner lowered it), flag
        // the overflow as an issue so it can't be approved. Approved keepers are
        // protected first, then the earliest cost-round picks; the rest are over.
        const overLimitKeys = new Set();
        const selByTeam = new Map();
        for (const s of selections) {
                if (!selByTeam.has(s.team_key)) selByTeam.set(s.team_key, []);
                selByTeam.get(s.team_key).push(s);
        }
        for (const list of selByTeam.values()) {
                const ordered = [...list].sort((a, b) => {
                        const ap = (a.status === 'approved' ? 0 : 1) - (b.status === 'approved' ? 0 : 1);
                        if (ap !== 0) return ap;
                        return Number(a.cost_round) - Number(b.cost_round);
                });
                ordered.slice(maxKeepers).forEach((s) => overLimitKeys.add(`${s.team_key}::${s.player_key}`));
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
                if (overLimitKeys.has(`${s.team_key}::${s.player_key}`)) {
                        issues.push(`Over the keeper limit of ${maxKeepers}`);
                }
                s.issues = issues;
                s.warnings = warnings;
                s.valid = issues.length === 0;
        }

        return {
                upcomingYear,
                requiresAuth,
                maxKeepers,
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
        // team.atLimit is derived from the same all-selections count the UI uses,
        // so server enforcement and the disabled "Limit reached" state stay in sync.
        if (team.atLimit) {
                return { ok: false, error: `Keeper limit reached — you can keep at most ${state.maxKeepers} player${state.maxKeepers === 1 ? '' : 's'}.` };
        }
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
