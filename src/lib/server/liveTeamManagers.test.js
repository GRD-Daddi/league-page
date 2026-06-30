import { describe, it, expect, vi, beforeEach } from 'vitest';

// Local replica of getTeamFromTeamManagers (the real one lives in
// universalFunctions.js, which imports browser-only $app/navigation and so can't
// be loaded in the node test env). Mirrors the exact access path the component
// uses, so this proves the structure the real helper depends on is intact.
const getTeamFromTeamManagers = (teamManagers, rosterID, year) => {
        if (!year || year > teamManagers.currentSeason) year = teamManagers.currentSeason;
        return teamManagers.teamManagersMap[year][rosterID]['team'];
};

// Locks in the SSR shape that the legacy display components (Matchup, Brackets,
// ...) require from loadLiveTeamManagers via the getTeamFromTeamManagers family:
// { currentSeason, teamManagersMap[year][roster_id]: { team, managers, roster },
// users[user_id] }. The /matchups live path previously fed those components a
// flat { user_id: user } map, which made getTeamFromTeamManagers throw on real
// Yahoo data. It also guards the roster-shape regression: loadLeagueRosters
// returns { rosters: { [id]: roster } }, NOT a bare array, so the builder must
// iterate the values (iterating the object directly throws "not iterable").
//
// The platform API is mocked so the REAL loadLiveTeamManagers + processRosters +
// processLeagueUsers + getTeamData path runs (this can't be exercised through the
// live OAuth flow inside the Replit preview iframe).

const getLeagueData = vi.fn();
const getLeagueRosters = vi.fn();
const getLeagueUsers = vi.fn();

vi.mock('$lib/utils/platformApi.js', async () => {
        const actual = await vi.importActual('$lib/utils/platformApi.js');
        return {
                ...actual,
                getLeagueData: (...args) => getLeagueData(...args),
                getLeagueRosters: (...args) => getLeagueRosters(...args),
                getLeagueUsers: (...args) => getLeagueUsers(...args)
        };
});

const { loadLiveTeamManagers } = await import('./dataLoaders.js');

const user = (userId, teamName, manager, avatar) => ({
        user_id: userId,
        display_name: manager,
        avatar,
        metadata: { team_name: teamName }
});

beforeEach(() => {
        vi.clearAllMocks();
        getLeagueData.mockResolvedValue({ season: '2025' });
        getLeagueUsers.mockResolvedValue([
                user('guid-ann', 'Ann Team', 'Ann', 'https://example.com/ann.png'),
                user('guid-bob', 'Bob Team', 'Bob', 'https://example.com/bob.png')
        ]);
        // processRosters returns { rosters: { [roster_id]: roster }, ... } — the
        // builder must read .rosters and iterate its VALUES.
        getLeagueRosters.mockResolvedValue([
                { roster_id: 1, owner_id: 'guid-ann', starters: [], players_detail: {} },
                { roster_id: 2, owner_id: 'guid-bob', starters: [], players_detail: {} }
        ]);
});

describe('loadLiveTeamManagers', () => {
        it('builds the { currentSeason, teamManagersMap, users } structure', async () => {
                const tm = await loadLiveTeamManagers({ authed: true }, 'nfl.l.1');

                expect(tm.currentSeason).toBe(2025);
                expect(Object.keys(tm.teamManagersMap)).toEqual(['2025']);
                expect(tm.teamManagersMap[2025][1]).toMatchObject({
                        team: { name: 'Ann Team' },
                        managers: ['guid-ann']
                });
                expect(tm.teamManagersMap[2025][2].team.name).toBe('Bob Team');
                expect(tm.users['guid-ann'].display_name).toBe('Ann');
        });

        it('lets getTeamFromTeamManagers resolve a team without throwing', async () => {
                const tm = await loadLiveTeamManagers({ authed: true }, 'nfl.l.1');
                expect(() => getTeamFromTeamManagers(tm, 1, 2025)).not.toThrow();
                expect(getTeamFromTeamManagers(tm, 1, 2025).name).toBe('Ann Team');
        });

        it('normalizes an absolute Yahoo avatar instead of double-prefixing it', async () => {
                const tm = await loadLiveTeamManagers({ authed: true }, 'nfl.l.1');
                expect(tm.teamManagersMap[2025][1].team.avatar).toBe('https://example.com/ann.png');
        });

        it('returns an empty (non-throwing) map when the roster fetch hits an auth error', async () => {
                // loadLeagueRosters converts a thrown auth error into a null return; the
                // builder must tolerate that (Object.values of nothing) rather than crash.
                getLeagueRosters.mockRejectedValue(new Error('authentication required'));
                const tm = await loadLiveTeamManagers(null, 'nfl.l.1');
                expect(tm.currentSeason).toBe(2025);
                expect(tm.teamManagersMap[2025]).toEqual({});
        });
});
