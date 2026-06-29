import { KEEPER_MAX_SEASONS, WAIVER_COST_ROUND } from '$lib/utils/keeperRules.js';
import { playerIdFromKey } from './keeperArchive.js';

/**
 * Pure keeper rules engine. Given the persisted draft + transaction history and
 * the current rosters, it reconstructs each rostered player's acquisition
 * lineage and derives keeper eligibility for an upcoming draft.
 *
 * Lineage rules (replayed in chronological order per player):
 *  - A non-keeper draft starts a fresh lineage; cost = that draft round.
 *  - A keeper draft continues the existing lineage (cost & acquisition year stay).
 *  - A waiver / FA "add" starts a fresh lineage at the round-6 cost.
 *  - A "trade" carries the existing lineage to the new owner (no reset).
 *  - A non-trade "drop" breaks the lineage (eligibility resets).
 *
 * Eligibility for `upcomingYear`:
 *  - rules: KEEPER_MAX_SEASONS - (upcomingYear - acquisitionYear) >= 1.
 *  - pick: the owning team must hold a pick in the keeper's cost round in the
 *    upcoming draft's pick-ownership board.
 */

/**
 * Reconstruct the current keeper lineage for one player from their sorted
 * draft + transaction events. Returns { lineage, startedFromKeeper, hasHistory }.
 * `lineage` is null when the player has no active lineage (e.g. last seen event
 * was a drop, or there is no history at all).
 */
export function resolveLineage(playerId, draftsById, txById) {
        const drafts = draftsById.get(playerId) || [];
        const txs = txById.get(playerId) || [];

        const events = [];
        for (const d of drafts) {
                events.push({
                        kind: 'draft',
                        year: Number(d.year),
                        phase: 0,
                        ts: 0,
                        round: parseInt(d.round, 10) || null,
                        isKeeper: !!d.is_keeper
                });
        }
        for (const t of txs) {
                events.push({
                        kind: t.type,
                        year: Number(t.year),
                        phase: 1,
                        ts: Number(t.timestamp) || 0
                });
        }

        // Same-season ordering: the draft (phase 0) precedes in-season moves
        // (phase 1), then by timestamp.
        events.sort((a, b) => a.year - b.year || a.phase - b.phase || a.ts - b.ts);

        let lineage = null;
        let startedFromKeeper = false;
        // The event that began the currently-active lineage. Every event from this
        // one onward belongs to the lineage the player can still be kept on; anything
        // before it was reset by a drop and is "previous history".
        let lineageStart = null;

        for (const ev of events) {
                if (ev.kind === 'draft') {
                        if (ev.isKeeper && lineage) {
                                // Keeper re-designation continues the existing lineage.
                                continue;
                        }
                        lineage = {
                                acquisitionYear: ev.year,
                                costRound: ev.round || WAIVER_COST_ROUND,
                                source: ev.isKeeper ? 'keeper' : 'draft'
                        };
                        lineageStart = ev;
                        // A keeper draft with no prior lineage in our data means history
                        // starts mid-stream — the true acquisition is older than we know.
                        startedFromKeeper = !!ev.isKeeper;
                } else if (ev.kind === 'add') {
                        lineage = { acquisitionYear: ev.year, costRound: WAIVER_COST_ROUND, source: 'waiver' };
                        lineageStart = ev;
                        startedFromKeeper = false;
                } else if (ev.kind === 'trade') {
                        if (!lineage) {
                                // Traded to this owner with no known prior lineage — treat as a
                                // round-6 acquisition at the trade year and flag for review.
                                lineage = { acquisitionYear: ev.year, costRound: WAIVER_COST_ROUND, source: 'trade' };
                                lineageStart = ev;
                                startedFromKeeper = true;
                        } else {
                                lineage.traded = true;
                        }
                } else if (ev.kind === 'drop') {
                        lineage = null;
                        lineageStart = null;
                        startedFromKeeper = false;
                }
        }

        const startIndex = lineageStart ? events.indexOf(lineageStart) : -1;
        return { lineage, startedFromKeeper, hasHistory: events.length > 0, events, startIndex };
}

function buildIndexes(drafts, transactions) {
        const draftsById = new Map();
        for (const d of drafts || []) {
                const id = d.player_id || playerIdFromKey(d.player_key);
                if (!id) continue;
                if (!draftsById.has(id)) draftsById.set(id, []);
                draftsById.get(id).push(d);
        }
        const txById = new Map();
        for (const t of transactions || []) {
                const id = t.player_id || playerIdFromKey(t.player_key);
                if (!id) continue;
                if (!txById.has(id)) txById.set(id, []);
                txById.get(id).push(t);
        }
        return { draftsById, txById };
}

/**
 * Evaluate one rostered player. `detail` is the Yahoo players_detail entry
 * ({ fn, ln, pos, t, img }). `teamPicks` is the team's per-round pick counts for
 * the upcoming draft (1-indexed by round → teamPicks[round-1]).
 */
export function evaluatePlayer({ playerKey, detail, teamKey, draftsById, txById, upcomingYear, teamPicks, roundsMax }) {
        const playerId = playerIdFromKey(playerKey);
        const { lineage, startedFromKeeper, hasHistory, events, startIndex } = resolveLineage(playerId, draftsById, txById);

        // A drill-in timeline of every recorded move for this player, oldest first.
        // `current` flags the events that make up the active keeper lineage (from the
        // most recent acquisition onward); earlier ones were reset by a drop.
        const history = (events || []).map((ev, i) => ({
                year: ev.year,
                kind: ev.kind,
                round: ev.kind === 'draft' ? ev.round || null : null,
                isKeeper: ev.kind === 'draft' ? !!ev.isKeeper : false,
                current: startIndex >= 0 && i >= startIndex
        }));

        const name = detail
                ? `${detail.fn || ''} ${detail.ln || ''}`.trim() || detail.full_name || 'Unknown Player'
                : 'Unknown Player';

        const out = {
                playerKey,
                playerId,
                name,
                pos: detail?.pos || detail?.position || null,
                nflTeam: detail?.t || detail?.team || null,
                img: detail?.img || null,
                teamKey,
                needsReview: false,
                history
        };

        const maxRound = Number.isFinite(roundsMax) && roundsMax > 0 ? roundsMax : 15;

        if (!lineage) {
                out.costRound = WAIVER_COST_ROUND;
                out.acquisitionYear = null;
                out.remainingYears = null;
                out.source = 'unknown';
                out.eligibleByRules = true; // unknown — let the commissioner verify
                out.needsReview = true;
                out.reason = hasHistory
                        ? 'Acquisition history unclear — verify keeper status'
                        : 'No draft/transaction history found — defaulting to round 6, verify';
        } else {
                out.costRound = Math.min(Math.max(parseInt(lineage.costRound, 10) || WAIVER_COST_ROUND, 1), maxRound);
                out.acquisitionYear = lineage.acquisitionYear;
                out.source = lineage.source;
                const seasonsUsed = upcomingYear - lineage.acquisitionYear;
                out.remainingYears = KEEPER_MAX_SEASONS - seasonsUsed;
                out.eligibleByRules = seasonsUsed >= 0 && out.remainingYears >= 1;
                out.needsReview = !!startedFromKeeper;

                const srcLabel =
                        lineage.source === 'waiver'
                                ? `Waiver/FA pickup ${lineage.acquisitionYear}`
                                : lineage.source === 'trade'
                                        ? `Acquired via trade ${lineage.acquisitionYear}`
                                        : `Drafted ${lineage.acquisitionYear} (round ${out.costRound})`;
                const tradedNote = lineage.traded && lineage.source !== 'trade' ? ', traded since' : '';

                if (!out.eligibleByRules) {
                        out.reason = `${srcLabel}${tradedNote} · max ${KEEPER_MAX_SEASONS} seasons reached — returns to draft pool`;
                } else {
                        out.reason = `${srcLabel}${tradedNote} · ${out.remainingYears} keeper year${out.remainingYears === 1 ? '' : 's'} left`;
                }
        }

        const ownedInRound = Number(teamPicks?.[out.costRound - 1]) || 0;
        out.ownedPicksInRound = ownedInRound;
        out.hasPickInRound = ownedInRound > 0;
        out.eligible = !!out.eligibleByRules && out.hasPickInRound;
        if (out.eligibleByRules && !out.hasPickInRound) {
                out.reason += ` · no pick in round ${out.costRound} to use`;
        }
        return out;
}

/**
 * Compute keeper eligibility for every rostered player across all teams.
 *
 * @param {object} args
 * @param {Array}  args.drafts        draft_results_archive rows
 * @param {Array}  args.transactions  transaction_archive rows
 * @param {object} args.rostersMap    roster_id -> { metadata:{team_key,team_name}, players:[player_key], players_detail }
 * @param {number} args.upcomingYear  the upcoming draft year to evaluate against
 * @param {object} args.pickOwnership { rounds, teams:[{teamKey, teamName, picks[]}] }
 * @param {Map}    [args.teamKeyRemap] maps a fallback-season roster team_key to the
 *                 upcoming league's team_key (same owner). Yahoo issues a new league
 *                 key every season, so a preseason fallback roster carries last
 *                 season's keys; without this remap it never matches its picks.
 * @returns {Array} teams: [{ rosterId, teamKey, teamName, picks, players:[evalPlayer] }]
 */
export function computeKeepers({ drafts, transactions, rostersMap, upcomingYear, pickOwnership, teamKeyRemap }) {
        const { draftsById, txById } = buildIndexes(drafts, transactions);
        const roundsMax = pickOwnership?.rounds || 15;

        const picksByTeam = new Map();
        for (const team of pickOwnership?.teams || []) {
                picksByTeam.set(team.teamKey, team.picks || []);
        }

        const teams = [];
        for (const rosterId of Object.keys(rostersMap || {})) {
                const r = rostersMap[rosterId];
                const rawKey = r?.metadata?.team_key;
                if (!rawKey) continue;
                // Resolve to the upcoming league's franchise key so pick ownership,
                // selections, and board consumption all key off the same identity.
                const teamKey = teamKeyRemap?.get(rawKey) || rawKey;
                const teamPicks = picksByTeam.get(teamKey) || [];
                const detailMap = r.players_detail || {};

                const players = (r.players || []).map((playerKey) =>
                        evaluatePlayer({
                                playerKey,
                                detail: detailMap[playerKey],
                                teamKey,
                                draftsById,
                                txById,
                                upcomingYear,
                                teamPicks,
                                roundsMax
                        })
                );

                // Eligible first, then by cost round (cheapest keeper first), then name.
                players.sort((a, b) => {
                        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
                        if (a.eligibleByRules !== b.eligibleByRules) return a.eligibleByRules ? -1 : 1;
                        if ((a.costRound || 99) !== (b.costRound || 99)) return (a.costRound || 99) - (b.costRound || 99);
                        return a.name.localeCompare(b.name);
                });

                teams.push({
                        rosterId: Number(rosterId),
                        teamKey,
                        teamName: r?.metadata?.team_name || 'Unknown Team',
                        picks: teamPicks,
                        players
                });
        }

        teams.sort((a, b) => a.teamName.localeCompare(b.teamName));
        return teams;
}
