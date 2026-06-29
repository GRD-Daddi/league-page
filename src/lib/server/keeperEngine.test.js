import { describe, it, expect } from 'vitest';
import { resolveLineage, evaluatePlayer, computeKeepers } from './keeperEngine.js';
import { KEEPER_MAX_SEASONS, WAIVER_COST_ROUND, keeperYearsRemaining } from '$lib/utils/keeperRules.js';

// These tests exercise the pure keeper rules engine end-to-end against synthetic
// draft/transaction archives — the league rules that cannot be validated through
// the live OAuth flow inside the Replit preview iframe. They lock in the
// documented league conventions: 3-season cap, drop breaks lineage, trade
// carries cost + year, waiver/FA = round 6, and pick-availability gating.

const draftMap = (id, rows) => new Map([[id, rows]]);
const txMap = (id, rows) => new Map([[id, rows]]);

describe('resolveLineage', () => {
        it('starts a fresh lineage from a non-keeper draft (cost = draft round)', () => {
                const { lineage, startedFromKeeper, hasHistory } = resolveLineage(
                        '100',
                        draftMap('100', [{ year: 2024, round: 3, is_keeper: false }]),
                        new Map()
                );
                expect(hasHistory).toBe(true);
                expect(startedFromKeeper).toBe(false);
                expect(lineage).toMatchObject({ acquisitionYear: 2024, costRound: 3, source: 'draft' });
        });

        it('continues the existing lineage when a player is re-drafted as a keeper', () => {
                const { lineage } = resolveLineage(
                        '100',
                        draftMap('100', [
                                { year: 2023, round: 3, is_keeper: false },
                                { year: 2024, round: 1, is_keeper: true }
                        ]),
                        new Map()
                );
                // Keeper re-designation must NOT reset acquisition year or cost round.
                expect(lineage).toMatchObject({ acquisitionYear: 2023, costRound: 3, source: 'draft' });
        });

        it('breaks the lineage on a drop (eligibility resets)', () => {
                const { lineage } = resolveLineage(
                        '100',
                        draftMap('100', [{ year: 2023, round: 2, is_keeper: false }]),
                        txMap('100', [{ type: 'drop', year: 2023, timestamp: 5 }])
                );
                expect(lineage).toBeNull();
        });

        it('treats a waiver/FA add as a fresh round-6 lineage', () => {
                const { lineage } = resolveLineage(
                        '100',
                        new Map(),
                        txMap('100', [{ type: 'add', year: 2024, timestamp: 1 }])
                );
                expect(lineage).toMatchObject({
                        acquisitionYear: 2024,
                        costRound: WAIVER_COST_ROUND,
                        source: 'waiver'
                });
        });

        it('starts a fresh year-1 lineage after a drop then re-acquire', () => {
                const { lineage } = resolveLineage(
                        '100',
                        draftMap('100', [{ year: 2023, round: 2, is_keeper: false }]),
                        txMap('100', [
                                { type: 'drop', year: 2023, timestamp: 5 },
                                { type: 'add', year: 2024, timestamp: 1 }
                        ])
                );
                // Re-acquire after a break = fresh lineage at the new year, round-6 cost.
                expect(lineage).toMatchObject({
                        acquisitionYear: 2024,
                        costRound: WAIVER_COST_ROUND,
                        source: 'waiver'
                });
        });

        it('carries the drafted cost + acquisition year across a trade', () => {
                const { lineage } = resolveLineage(
                        '100',
                        draftMap('100', [{ year: 2023, round: 4, is_keeper: false }]),
                        txMap('100', [{ type: 'trade', year: 2024, timestamp: 1 }])
                );
                expect(lineage).toMatchObject({ acquisitionYear: 2023, costRound: 4, source: 'draft' });
                expect(lineage.traded).toBe(true);
        });
});

describe('evaluatePlayer eligibility', () => {
        const base = {
                playerKey: 'nfl.p.100',
                detail: { fn: 'Joe', ln: 'Back', pos: 'RB', t: 'KC' },
                teamKey: 'nfl.l.1.t.1',
                txById: new Map(),
                teamPicks: Array(15).fill(1),
                roundsMax: 15
        };

        it('is eligible with years remaining when within the season cap', () => {
                const out = evaluatePlayer({
                        ...base,
                        draftsById: draftMap('100', [{ year: 2023, round: 3, is_keeper: false }]),
                        upcomingYear: 2025
                });
                expect(out.costRound).toBe(3);
                expect(out.remainingYears).toBe(2); // drafted, never kept → only season 1 used
                expect(out.eligibleByRules).toBe(true);
                expect(out.eligible).toBe(true);
        });

        it('keeps a long-ago draftee eligible when never actually kept (no calendar maxing)', () => {
                const out = evaluatePlayer({
                        ...base,
                        draftsById: draftMap('100', [{ year: 2021, round: 8, is_keeper: false }]),
                        upcomingYear: 2026
                });
                // Drafted 2021, never kept since → only season 1 used, still keepable.
                expect(out.eligibleByRules).toBe(true);
                expect(out.remainingYears).toBe(2);
        });

        it('is ineligible once a player has been kept the full 3 seasons', () => {
                const out = evaluatePlayer({
                        ...base,
                        draftsById: draftMap('100', [
                                { year: 2022, round: 5, is_keeper: false }, // season 1 (drafted)
                                { year: 2023, round: 5, is_keeper: true }, // season 2 (kept)
                                { year: 2024, round: 5, is_keeper: true } // season 3 (kept) → maxed
                        ]),
                        upcomingYear: 2025
                });
                expect(out.remainingYears).toBe(0); // 3 seasons held, none left
                expect(out.eligibleByRules).toBe(false);
                expect(out.eligible).toBe(false);
        });

        it('infers a pre-records origin season when the lineage starts as a keeper', () => {
                // Puka-style: undrafted waiver pickup whose add was never archived, then
                // kept 2024 + 2025. A keep in 2024 implies a 2023 roster spot, so the
                // engine must count 3 seasons (origin + 2 keeps) and surface that origin.
                const out = evaluatePlayer({
                        ...base,
                        draftsById: draftMap('100', [
                                { year: 2024, round: 6, is_keeper: true }, // first record = a keep
                                { year: 2025, round: 6, is_keeper: true }
                        ]),
                        upcomingYear: 2026
                });
                expect(out.source).toBe('keeper');
                expect(out.needsReview).toBe(true);
                expect(out.seasonsHeld).toBe(3); // implied 2023 origin + 2024 + 2025 keeps
                expect(out.remainingYears).toBe(0);
                expect(out.eligibleByRules).toBe(false);
                // The timeline must show the inferred origin so 3 seasons reconcile.
                const inferred = out.history.find((h) => h.kind === 'inferred-origin');
                expect(inferred).toBeTruthy();
                expect(inferred.year).toBe(2023);
                expect(inferred.isKeeper).toBe(false);
        });

        it('does NOT infer an origin season for a trade with no prior draft lineage', () => {
                // A traded-in player with no recorded draft history starts a lineage too,
                // but we have no basis to invent a pre-trade origin season — only true
                // keeper-start lineages get the inferred-origin row.
                const out = evaluatePlayer({
                        ...base,
                        draftsById: new Map(),
                        txById: txMap('100', [{ type: 'trade', year: 2024, timestamp: 1 }]),
                        upcomingYear: 2026
                });
                expect(out.source).toBe('trade');
                expect(out.needsReview).toBe(true);
                expect(out.history.some((h) => h.kind === 'inferred-origin')).toBe(false);
        });

        it('flags unknown-history players for review but does not auto-block them', () => {
                const out = evaluatePlayer({
                        ...base,
                        draftsById: new Map(),
                        upcomingYear: 2025
                });
                expect(out.source).toBe('unknown');
                expect(out.needsReview).toBe(true);
                expect(out.costRound).toBe(WAIVER_COST_ROUND);
                expect(out.eligibleByRules).toBe(true);
        });

        it('gates `eligible` on owning a pick in the keeper cost round', () => {
                const noPicks = Array(15).fill(1);
                noPicks[2] = 0; // round 3 traded away
                const out = evaluatePlayer({
                        ...base,
                        draftsById: draftMap('100', [{ year: 2024, round: 3, is_keeper: false }]),
                        upcomingYear: 2025,
                        teamPicks: noPicks
                });
                expect(out.eligibleByRules).toBe(true);
                expect(out.hasPickInRound).toBe(false);
                expect(out.eligible).toBe(false);
                expect(out.reason).toContain('no pick in round 3');
        });
});

describe('computeKeepers integration', () => {
        it('evaluates every rostered player and sorts eligible keepers first', () => {
                const rostersMap = {
                        1: {
                                metadata: { team_key: 'nfl.l.1.t.1', team_name: 'Alpha' },
                                players: ['nfl.p.100', 'nfl.p.200'],
                                players_detail: {
                                        'nfl.p.100': { fn: 'Joe', ln: 'Back', pos: 'RB', t: 'KC' },
                                        'nfl.p.200': { fn: 'Old', ln: 'Timer', pos: 'WR', t: 'SF' }
                                }
                        }
                };
                const drafts = [
                        { player_id: '100', year: 2024, round: 3, is_keeper: false },
                        { player_id: '200', year: 2021, round: 2, is_keeper: false }, // season 1 (drafted)
                        { player_id: '200', year: 2022, round: 2, is_keeper: true }, // season 2 (kept)
                        { player_id: '200', year: 2023, round: 2, is_keeper: true } // season 3 (kept) → maxed
                ];
                const pickOwnership = {
                        rounds: 15,
                        teams: [{ teamKey: 'nfl.l.1.t.1', teamName: 'Alpha', picks: Array(15).fill(1) }]
                };

                const teams = computeKeepers({
                        drafts,
                        transactions: [],
                        rostersMap,
                        upcomingYear: 2025,
                        pickOwnership
                });

                expect(teams).toHaveLength(1);
                expect(teams[0].teamName).toBe('Alpha');
                const [first, second] = teams[0].players;
                expect(first.playerId).toBe('100');
                expect(first.eligible).toBe(true);
                expect(second.playerId).toBe('200');
                expect(second.eligibleByRules).toBe(false);
        });
});

describe('keeperYearsRemaining helper', () => {
        it('matches the documented cap math', () => {
                expect(keeperYearsRemaining(2025, 2025)).toBe(KEEPER_MAX_SEASONS); // drafted this year
                expect(keeperYearsRemaining(2023, 2025)).toBe(1); // last keeper year
                expect(keeperYearsRemaining(2022, 2025)).toBe(0); // exhausted
                expect(keeperYearsRemaining(null, 2025)).toBeNull();
        });
});
