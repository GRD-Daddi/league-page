import { describe, it, expect } from 'vitest';
import { computeOrphanedApprovedKeepers } from './keepers.js';

// Locks in the draft-board reconciliation rule: when a saved pick-ownership board
// leaves a team with fewer picks in a round than it has approved keepers costing
// that round, EVERY approved keeper in that round is flagged for re-approval so
// the public board can never render a negative/over-limit state.

const keeper = (teamKey, playerKey, costRound, name) => ({
	team_key: teamKey,
	player_key: playerKey,
	cost_round: costRound,
	player_name: name
});

const board = (teams) => ({
	rounds: 15,
	teams: teams.map((t) => ({ teamKey: t.teamKey, picks: t.picks }))
});

describe('computeOrphanedApprovedKeepers', () => {
	it('flags nothing when every round owns enough picks', () => {
		const approved = [keeper('t1', 'p1', 3, 'A'), keeper('t1', 'p2', 5, 'B')];
		const picks = board([{ teamKey: 't1', picks: [1, 1, 1, 1, 1] }]);
		expect(computeOrphanedApprovedKeepers(approved, picks)).toEqual([]);
	});

	it('flags a keeper whose cost round was traded down to 0 picks', () => {
		const approved = [keeper('t1', 'p1', 3, 'A')];
		const picks = board([{ teamKey: 't1', picks: [1, 1, 0, 1, 1] }]);
		const out = computeOrphanedApprovedKeepers(approved, picks);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ teamKey: 't1', playerKey: 'p1', round: 3, owned: 0, approved: 1 });
	});

	it('flags ALL approved keepers in an over-subscribed round, not just the excess', () => {
		const approved = [keeper('t1', 'p1', 3, 'A'), keeper('t1', 'p2', 3, 'B')];
		const picks = board([{ teamKey: 't1', picks: [1, 1, 1, 1, 1] }]); // owns 1 in R3, 2 keepers
		const out = computeOrphanedApprovedKeepers(approved, picks);
		expect(out).toHaveLength(2);
		expect(out.map((k) => k.playerKey).sort()).toEqual(['p1', 'p2']);
	});

	it('does not flag a round that still has exactly enough picks', () => {
		const approved = [keeper('t1', 'p1', 2, 'A'), keeper('t1', 'p2', 2, 'B')];
		const picks = board([{ teamKey: 't1', picks: [1, 2, 1, 1, 1] }]); // owns 2 in R2
		expect(computeOrphanedApprovedKeepers(approved, picks)).toEqual([]);
	});

	it('treats a team missing from the board as owning 0 picks everywhere', () => {
		const approved = [keeper('t9', 'p1', 4, 'A')];
		const picks = board([{ teamKey: 't1', picks: [1, 1, 1, 1, 1] }]);
		const out = computeOrphanedApprovedKeepers(approved, picks);
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({ teamKey: 't9', round: 4, owned: 0 });
	});

	it('handles empty inputs without throwing', () => {
		expect(computeOrphanedApprovedKeepers([], board([]))).toEqual([]);
		expect(computeOrphanedApprovedKeepers(undefined, undefined)).toEqual([]);
	});
});
