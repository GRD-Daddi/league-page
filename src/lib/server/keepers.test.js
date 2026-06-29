import { describe, it, expect, vi, beforeEach } from 'vitest';

// These tests lock in the per-round keeper over-subscription warnings and the
// manager submit-path block. The live behaviour cannot be exercised through the
// Yahoo OAuth flow inside the Replit preview iframe, so the data-source modules
// (DB, Yahoo loaders, archives) are mocked and the REAL getKeeperState /
// saveKeeperSelection run against synthetic-but-realistic league state.
//
// Scenario mirrors a manually verified real-league case: a team that owns one
// round-6 pick but has two approved round-6 keepers (the "pick lost after
// approval" state) must surface roundConflicts on every UI surface.

const query = vi.fn();
const loadLeagueRostersWithFallback = vi.fn();
const loadLeagueUsers = vi.fn();
const getDraftPickOwnership = vi.fn();
const getDraftResultsArchive = vi.fn();
const getTransactionArchive = vi.fn();
const getArchivedStandings = vi.fn();

vi.mock('./db.js', () => ({ query: (...args) => query(...args) }));
vi.mock('./pot.js', () => ({
        getCurrentSeasonYear: () => 2026,
        getSettings: async () => ({ maxKeepers: 2 })
}));
vi.mock('./dataLoaders.js', () => ({
        loadLeagueRostersWithFallback: (...args) => loadLeagueRostersWithFallback(...args),
        loadLeagueUsers: (...args) => loadLeagueUsers(...args)
}));
vi.mock('./draftPicks.js', () => ({
        getDraftPickOwnership: (...args) => getDraftPickOwnership(...args),
        DRAFT_ROUNDS: 15
}));
vi.mock('./keeperArchive.js', () => ({
        getDraftResultsArchive: (...args) => getDraftResultsArchive(...args),
        getTransactionArchive: (...args) => getTransactionArchive(...args),
        // Real implementation so the keeper engine can still map player keys -> ids.
        playerIdFromKey: (playerKey) => {
                const s = String(playerKey || '');
                const m = s.match(/\.p\.(\d+)/) || s.match(/^(\d+)$/);
                return m ? m[1] : null;
        }
}));
vi.mock('./archive.js', () => ({
        getArchivedStandings: (...args) => getArchivedStandings(...args)
}));

const { getKeeperState, saveKeeperSelection } = await import('./keepers.js');

const TEAM_KEY = '470.l.99366.t.1';

// One franchise that owns exactly 1 pick in round 6 (index 5), 1 everywhere else.
function picksWithOneInRound6() {
        const picks = Array(15).fill(1);
        return picks;
}

function rostersFixture(extraPlayers = {}) {
        return {
                fromSeason: null,
                rosters: {
                        1: {
                                owner_id: 'GUID-1',
                                metadata: { team_key: TEAM_KEY, team_name: 'BBL Daddi' },
                                players: ['461.p.33989', '461.p.32803', ...Object.keys(extraPlayers)],
                                players_detail: {
                                        '461.p.33989': { fn: 'Christian', ln: 'Watson', pos: 'WR', t: 'GB' },
                                        '461.p.32803': { fn: 'Colby', ln: 'Parkinson', pos: 'TE', t: 'LAR' },
                                        ...extraPlayers
                                }
                        }
                }
        };
}

function usersFixture() {
        return [
                {
                        user_id: 'u1',
                        display_name: 'BBL',
                        metadata: {
                                team_key: TEAM_KEY,
                                team_name: 'BBL Daddi',
                                manager_nickname: 'BBL',
                                yahoo_guid: 'GUID-1'
                        }
                }
        ];
}

beforeEach(() => {
        vi.clearAllMocks();
        loadLeagueRostersWithFallback.mockResolvedValue(rostersFixture());
        loadLeagueUsers.mockResolvedValue(usersFixture());
        getDraftPickOwnership.mockResolvedValue({
                rounds: 15,
                teams: [{ teamKey: TEAM_KEY, teamName: 'BBL Daddi', picks: picksWithOneInRound6() }]
        });
        // Both keeper players were drafted in 2024 round 6 -> eligible for 2026 (1 year left).
        getDraftResultsArchive.mockResolvedValue([
                { player_id: '33989', player_key: '461.p.33989', year: 2024, round: 6, is_keeper: false },
                { player_id: '32803', player_key: '461.p.32803', year: 2024, round: 6, is_keeper: false }
        ]);
        getTransactionArchive.mockResolvedValue([]);
        getArchivedStandings.mockResolvedValue([]);
        query.mockResolvedValue({ rows: [] });
});

describe('getKeeperState round over-subscription warnings', () => {
        it('flags overApproved + overSelected when approved keepers exceed owned picks in a round', async () => {
                // Two APPROVED keepers both cost round 6, but the team owns only one R6 pick.
                query.mockResolvedValueOnce({
                        rows: [
                                { team_key: TEAM_KEY, player_key: '461.p.33989', cost_round: 6, status: 'approved' },
                                { team_key: TEAM_KEY, player_key: '461.p.32803', cost_round: 6, status: 'approved' }
                        ]
                });

                const state = await getKeeperState(2026, {}, '470.l.99366');
                const team = state.teams.find((t) => t.teamKey === TEAM_KEY);

                expect(team.hasRoundConflict).toBe(true);
                expect(team.hasApprovedConflict).toBe(true);
                expect(team.roundConflicts).toEqual([
                        {
                                round: 6,
                                owned: 1,
                                selected: 2,
                                approved: 2,
                                overSelected: true,
                                overApproved: true
                        }
                ]);
        });

        it('flags overSelected only (not overApproved) when the extra keepers are still pending', async () => {
                query.mockResolvedValueOnce({
                        rows: [
                                { team_key: TEAM_KEY, player_key: '461.p.33989', cost_round: 6, status: 'approved' },
                                { team_key: TEAM_KEY, player_key: '461.p.32803', cost_round: 6, status: 'pending' }
                        ]
                });

                const state = await getKeeperState(2026, {}, '470.l.99366');
                const team = state.teams.find((t) => t.teamKey === TEAM_KEY);

                expect(team.hasRoundConflict).toBe(true);
                expect(team.hasApprovedConflict).toBe(false);
                expect(team.roundConflicts).toEqual([
                        { round: 6, owned: 1, selected: 2, approved: 1, overSelected: true, overApproved: false }
                ]);
        });

        it('reports no conflict when keepers fit within owned picks', async () => {
                query.mockResolvedValueOnce({
                        rows: [{ team_key: TEAM_KEY, player_key: '461.p.33989', cost_round: 6, status: 'approved' }]
                });

                const state = await getKeeperState(2026, {}, '470.l.99366');
                const team = state.teams.find((t) => t.teamKey === TEAM_KEY);

                expect(team.hasRoundConflict).toBe(false);
                expect(team.roundConflicts).toEqual([]);
        });
});

describe('getKeeperState owner-identity (archive) bridging', () => {
        const OLD_KEY = '461.l.744586.t.11'; // last season's franchise key
        const NEW_KEY = '470.l.99366.t.5'; // upcoming season's franchise key

        beforeEach(() => {
                // Fallback roster from 2025: hidden owner (no GUID) AND renamed team.
                // Its team_key is last season's key; picks/selections live under NEW_KEY.
                loadLeagueRostersWithFallback.mockResolvedValue({
                        fromSeason: '2025',
                        rosters: {
                                11: {
                                        owner_id: null, // hidden — no GUID to match (pass 1 fails)
                                        metadata: { team_key: OLD_KEY, team_name: 'Fries in the bag Tua' },
                                        players: ['461.p.33989'],
                                        players_detail: {
                                                '461.p.33989': { fn: 'Christian', ln: 'Watson', pos: 'WR', t: 'GB' }
                                        }
                                }
                        }
                });
                // Current league users list the renamed franchise under its new name and
                // a hidden GUID, so neither GUID nor team-name passes can bridge it.
                loadLeagueUsers.mockResolvedValue([
                        {
                                user_id: 'u5',
                                display_name: 'Tyler',
                                metadata: {
                                        team_key: NEW_KEY,
                                        team_name: 'Miami Tropics',
                                        manager_nickname: 'Tyler',
                                        yahoo_guid: null
                                }
                        }
                ]);
                getDraftPickOwnership.mockResolvedValue({
                        rounds: 15,
                        teams: [{ teamKey: NEW_KEY, teamName: 'Miami Tropics', picks: Array(15).fill(1) }]
                });
                // Archived owner identity is stable across seasons even when GUID hidden.
                getArchivedStandings.mockImplementation(async (year) => {
                        if (year === 2026) return [{ year: 2026, team_key: NEW_KEY, manager_name: 'Tyler' }];
                        if (year === 2025) return [{ year: 2025, team_key: OLD_KEY, manager_name: 'Tyler' }];
                        return [];
                });
        });

        it('bridges a hidden + renamed franchise to the upcoming team_key via archived manager identity', async () => {
                const state = await getKeeperState(2026, {}, '470.l.99366');

                // The team must surface under the UPCOMING key and current name...
                const team = state.teams.find((t) => t.teamKey === NEW_KEY);
                expect(team).toBeTruthy();
                expect(team.teamName).toBe('Miami Tropics');
                // ...and never linger under the stale last-season key.
                expect(state.teams.find((t) => t.teamKey === OLD_KEY)).toBeUndefined();

                // Pick ownership resolves under the bridged key: no false "no pick" reason.
                const player = team.players.find((p) => p.playerKey === '461.p.33989');
                expect(player).toBeTruthy();
                expect(player.costRound).toBe(6);
                expect(player.ownedPicksInRound).toBe(1);
                expect(player.hasPickInRound).toBe(true);
                expect(player.eligible).toBe(true);
                expect(player.reason).not.toMatch(/no pick in round/i);
        });

        it('does not bridge when archived manager identity is hidden (no spurious match)', async () => {
                getArchivedStandings.mockImplementation(async (year) => {
                        if (year === 2026) return [{ year: 2026, team_key: NEW_KEY, manager_name: '--hidden--' }];
                        if (year === 2025) return [{ year: 2025, team_key: OLD_KEY, manager_name: '--hidden--' }];
                        return [];
                });

                const state = await getKeeperState(2026, {}, '470.l.99366');

                // With no usable identity, the franchise keeps its stale key (unbridged),
                // proving the masked sentinel never produces a false franchise match.
                const team = state.teams.find((t) => t.teamKey === OLD_KEY);
                expect(team).toBeTruthy();
                expect(state.teams.find((t) => t.teamKey === NEW_KEY)).toBeUndefined();
        });
});

describe('saveKeeperSelection submit-path block (no regression)', () => {
        it('blocks an impossible keeper whose cost round has no available pick', async () => {
                // Player drafted 2024 round 3 (eligible), but the team owns zero R3 picks.
                const noR3Picks = Array(15).fill(1);
                noR3Picks[2] = 0;
                getDraftPickOwnership.mockResolvedValue({
                        rounds: 15,
                        teams: [{ teamKey: TEAM_KEY, teamName: 'BBL Daddi', picks: noR3Picks }]
                });
                loadLeagueRostersWithFallback.mockResolvedValue(
                        rostersFixture({ '461.p.32711': { fn: 'Jonathan', ln: 'Taylor', pos: 'RB', t: 'IND' } })
                );
                getDraftResultsArchive.mockResolvedValue([
                        { player_id: '32711', player_key: '461.p.32711', year: 2024, round: 3, is_keeper: false }
                ]);
                query.mockResolvedValue({ rows: [] }); // no existing selections

                const res = await saveKeeperSelection({
                        year: 2026,
                        teamKey: TEAM_KEY,
                        playerKey: '461.p.32711',
                        submittedBy: 'tester',
                        yahooClient: {},
                        leagueKey: '470.l.99366'
                });

                expect(res.ok).toBe(false);
                expect(res.error).toContain('No available pick in round 3');
                // The INSERT must never run for a blocked keeper.
                const insertCalls = query.mock.calls.filter(([sql]) => /INSERT INTO keeper_selections/i.test(sql));
                expect(insertCalls).toHaveLength(0);
        });

        it('refuses to save when live rosters are unavailable (requires auth)', async () => {
                loadLeagueRostersWithFallback.mockResolvedValue(null); // auth error path
                query.mockResolvedValue({ rows: [] });

                const res = await saveKeeperSelection({
                        year: 2026,
                        teamKey: TEAM_KEY,
                        playerKey: '461.p.33989',
                        submittedBy: 'tester',
                        yahooClient: null,
                        leagueKey: '470.l.99366'
                });

                expect(res.ok).toBe(false);
                expect(res.error).toMatch(/login is required/i);
        });
});
