import { describe, it, expect } from 'vitest';
import { buildDraftOrder } from './draftOrder.js';

// buildDraftOrder is pure: it numbers worst-first standings into Pick 1..N and
// bridges each archived row to the CURRENT league's owner/team. These tests lock
// in the league rule (worst finisher picks first, champion last) and the
// cross-season bridging behavior, which cannot be exercised through the live
// OAuth flow inside the Replit preview iframe.

const user = (teamKey, teamName, manager, guid) => ({
        display_name: manager,
        metadata: { team_key: teamKey, team_name: teamName, manager_nickname: manager, yahoo_guid: guid }
});

describe('buildDraftOrder', () => {
        it('numbers worst-first standings into Pick 1..N', () => {
                // Caller passes rows already ordered worst-first (final_rank DESC).
                const standings = [
                        { final_rank: 3, team_key: 'p.l.1.t.3', team_name: 'Cellar', manager_name: 'Carl' },
                        { final_rank: 2, team_key: 'p.l.1.t.2', team_name: 'Runner', manager_name: 'Bob' },
                        { final_rank: 1, team_key: 'p.l.1.t.1', team_name: 'Champs', manager_name: 'Ann' }
                ];
                const order = buildDraftOrder(standings, []);
                expect(order.map((o) => o.pick)).toEqual([1, 2, 3]);
                expect(order[0]).toMatchObject({ pick: 1, finalRank: 3, teamName: 'Cellar' });
                expect(order[2]).toMatchObject({ pick: 3, finalRank: 1, teamName: 'Champs' });
        });

        it('bridges to the current league name by manager identity', () => {
                const standings = [
                        { final_rank: 2, team_key: 'OLD.t.9', team_name: 'Old Name', manager_name: 'Bob' }
                ];
                const current = [user('NEW.t.4', 'Fresh Name', 'Bob', 'guid-bob')];
                const [entry] = buildDraftOrder(standings, current);
                expect(entry.teamKey).toBe('NEW.t.4');
                expect(entry.teamName).toBe('Fresh Name');
                expect(entry.managerName).toBe('Bob');
        });

        it('falls back to team name when the manager cannot be matched', () => {
                const standings = [
                        { final_rank: 1, team_key: 'OLD.t.1', team_name: 'Stable Team', manager_name: '--hidden--' }
                ];
                const current = [user('NEW.t.7', 'Stable Team', 'Someone', 'guid-x')];
                const [entry] = buildDraftOrder(standings, current);
                expect(entry.teamKey).toBe('NEW.t.7');
                expect(entry.teamName).toBe('Stable Team');
        });

        it('keeps archived names when there is no current match', () => {
                const standings = [
                        { final_rank: 1, team_key: 'OLD.t.1', team_name: 'Gone Team', manager_name: 'Departed' }
                ];
                const [entry] = buildDraftOrder(standings, []);
                expect(entry.teamKey).toBe('OLD.t.1');
                expect(entry.teamName).toBe('Gone Team');
                expect(entry.managerName).toBe('Departed');
        });

        it('does not match on the masked --hidden-- manager sentinel', () => {
                const standings = [
                        { final_rank: 1, team_key: 'OLD.t.1', team_name: 'Mystery', manager_name: '--hidden--' }
                ];
                const current = [user('NEW.t.1', 'Different', '--hidden--', null)];
                const [entry] = buildDraftOrder(standings, current);
                // No spurious bridge: keeps archived key, drops the masked manager name.
                expect(entry.teamKey).toBe('OLD.t.1');
                expect(entry.managerName).toBeNull();
        });

        it('returns an empty list for empty standings', () => {
                expect(buildDraftOrder([], [])).toEqual([]);
                expect(buildDraftOrder(undefined, undefined)).toEqual([]);
        });
});
