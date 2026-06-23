import { getYahooClient, withRetry } from './yahooClient.js';

const isHidden = (v) => !v || v === '--hidden--';

// Yahoo's `/teams` endpoint intermittently fails with "There was a temporary
// problem with the server" — sometimes persistently for a given league — even
// while other endpoints (settings, standings) respond fine. We retry it, then
// fall back to the `/standings` endpoint, which returns the same team objects
// (both go through the library's mapTeam). team_key/name/managers are identical.
async function fetchLeagueTeams(yf, leagueKey) {
        const validate = (arr, src) => {
                if (!Array.isArray(arr) || arr.length === 0) {
                        const err = new Error(`Empty Yahoo ${src} response`);
                        err.description = `Empty Yahoo ${src} response`;
                        throw err;
                }
                return arr;
        };

        try {
                return await withRetry(async () => {
                        const res = await yf.league.teams(leagueKey);
                        const arr = res?.teams || res?.league?.[0]?.teams?.[0]?.team || null;
                        return validate(arr, 'teams');
                });
        } catch (teamsErr) {
                console.warn('[Yahoo Adapter] /teams failed, falling back to /standings:',
                        teamsErr?.description || teamsErr?.message);
                try {
                        return await withRetry(async () => {
                                const res = await yf.league.standings(leagueKey);
                                const arr = res?.standings || null;
                                return validate(arr, 'standings');
                        });
                } catch (standingsErr) {
                        // Both team-collection endpoints (/teams, /standings) are erroring
                        // Yahoo-side for this league — common in the offseason / pre-draft
                        // window. Single-resource endpoints (/league/metadata,
                        // /team/{key}/metadata) keep working, so enumerate each team
                        // individually. Team keys are deterministic: {league_key}.t.{N}.
                        console.warn('[Yahoo Adapter] /standings also failed, enumerating teams individually:',
                                standingsErr?.description || standingsErr?.message);
                        return await fetchTeamsIndividually(yf, leagueKey);
                }
        }
}

// Build the team list by fetching each team's /metadata endpoint one at a time.
// Used when the league-level team-collection endpoints fail. Resolves the
// canonical (numeric game-prefixed) league key and team count from the league
// metadata call, which is reliable even when /teams and /standings are not.
async function fetchTeamsIndividually(yf, leagueKey) {
        const meta = await withRetry(() => yf.league.meta(leagueKey));
        const leagueMeta = meta?.league?.[0] || meta;
        const canonicalKey = leagueMeta?.league_key || leagueKey;
        const numTeams = parseInt(leagueMeta?.num_teams, 10) || 0;
        if (!numTeams) {
                const err = new Error('Could not determine num_teams for per-team fallback');
                err.description = err.message;
                throw err;
        }

        const teams = [];
        for (let n = 1; n <= numTeams; n++) {
                const teamKey = `${canonicalKey}.t.${n}`;
                try {
                        const teamMeta = await withRetry(() => yf.team.meta(teamKey));
                        if (teamMeta) teams.push(teamMeta);
                } catch (teamErr) {
                        console.warn(`[Yahoo Adapter] per-team meta failed for ${teamKey}:`,
                                teamErr?.description || teamErr?.message);
                }
        }

        if (teams.length === 0) {
                const err = new Error('Per-team metadata fallback returned no teams');
                err.description = err.message;
                throw err;
        }
        console.log(`[Yahoo Adapter] per-team fallback recovered ${teams.length}/${numTeams} teams`);
        return teams;
}

// Yahoo team payloads can arrive either as a flat (already-merged) object or as
// an array of segments. Merge all segments so key fields (team_key, name,
// managers) are reliably present regardless of which segment carries them.
function extractTeamMeta(team) {
        let teamMeta = {};
        let managers = [];
        if (Array.isArray(team)) {
                team.forEach((segment) => {
                        if (!segment) return;
                        teamMeta = { ...teamMeta, ...segment };
                        if (segment.managers) managers = segment.managers;
                });
        } else {
                teamMeta = team || {};
                managers = teamMeta.managers || [];
        }
        const manager = Array.isArray(managers) ? managers[0] : managers;
        const managerData = manager?.manager || manager || {};
        return { teamMeta, managerData };
}

export async function getYahooLeagueRosters(leagueKey, yahooClient = null) {
        const yf = yahooClient || getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const teamsArray = await fetchLeagueTeams(yf, leagueKey);

        const rosterPromises = teamsArray.map(async (team, index) => {
                // Resolve team_key shape-agnostically: flat objects, segmented arrays
                // (key may not be in index 0), and per-team-meta fallback all merge
                // through extractTeamMeta so no team is silently dropped.
                const teamKey = extractTeamMeta(team).teamMeta?.team_key;
                if (!teamKey) return null;
                
                try {
                        const roster = await withRetry(() => yf.team.roster(teamKey));
                        return convertRosterToSleeperFormat(team, roster, index + 1);
                } catch (err) {
                        console.error(`Error fetching roster for team ${teamKey}:`, err);
                        return convertRosterToSleeperFormat(team, null, index + 1);
                }
        });
        
        const rosters = await Promise.all(rosterPromises);
        const result = rosters.filter(r => r !== null);
        // TEMP DIAGNOSTIC: how many players each roster actually came back with,
        // plus the pre-draft order if Yahoo has set one. Tells us whether rosters
        // are empty Yahoo-side (pre-draft) or being dropped by parsing.
        console.log('[Yahoo Adapter] DIAG rosters for', leagueKey, '→',
                JSON.stringify(result.map(r => ({
                        roster_id: r.roster_id,
                        team: r.metadata?.team_name,
                        players: r.players?.length || 0,
                        starters: r.starters?.length || 0,
                        draft_position: r.metadata?.draft_position ?? null
                }))));
        return result;
}

export async function getYahooLeagueUsers(leagueKey, yahooClient = null) {
        const yf = yahooClient || getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        try {
                const teamsArray = await fetchLeagueTeams(yf, leagueKey);

                return teamsArray.map((team, index) => {
                        const { teamMeta, managerData } = extractTeamMeta(team);

                        const guid = isHidden(managerData.guid) ? null : managerData.guid;
                        const nickname = isHidden(managerData.nickname) ? null : managerData.nickname;
                        const stableId = guid || teamMeta.team_key || `yahoo_${index + 1}`;

                        return {
                                user_id: stableId,
                                username: nickname || teamMeta.name || `Team ${index + 1}`,
                                display_name: nickname || teamMeta.name || `Team ${index + 1}`,
                                avatar: managerData.image_url || null,
                                metadata: {
                                        team_key: teamMeta.team_key,
                                        team_name: teamMeta.name,
                                        yahoo_guid: guid,
                                        manager_nickname: nickname,
                                        is_commissioner: managerData.is_commissioner === '1',
                                        email: managerData.email || null
                                },
                                is_owner: managerData.is_commissioner === '1',
                                is_bot: false
                        };
                });
        } catch (error) {
                console.error('[Yahoo Adapter] Unexpected data structure in getYahooLeagueUsers:', error);
                console.error('League key:', leagueKey);
                return [];
        }
}

function convertRosterToSleeperFormat(team, rosterData, rosterId) {
        try {
                let teamMeta = {};
                let teamStandings = {};
                let managers = [];
                
                if (Array.isArray(team)) {
                team.forEach(segment => {
                        if (!segment || typeof segment !== 'object') return;
                        // Merge every segment so fields like draft_position that may live
                        // on a non-key-bearing segment are not dropped.
                        teamMeta = {...teamMeta, ...segment};
                        if (segment.team_standings || segment.standings) {
                                const rawStandings = segment.team_standings || segment.standings || {};
                                teamStandings = Array.isArray(rawStandings) && rawStandings.length > 0 ? rawStandings[0] : rawStandings;
                        }
                        if (segment.managers) {
                                managers = segment.managers;
                        }
                });
        } else {
                teamMeta = team;
                const rawStandings = team.team_standings || team.standings || {};
                teamStandings = Array.isArray(rawStandings) && rawStandings.length > 0 ? rawStandings[0] : rawStandings;
                managers = team.managers || [];
        }
        
        const manager = Array.isArray(managers) && managers.length > 0 ? managers[0] : managers;
        const managerData = manager?.manager || manager || {};
        
        let rosterPlayers = [];
        if (rosterData?.team && Array.isArray(rosterData.team)) {
                rosterData.team.forEach(segment => {
                        if (segment.roster) {
                                const rosterSegment = segment.roster;
                                rosterPlayers = rosterSegment.players?.[0]?.player || rosterSegment.players || [];
                        }
                });
        } else if (rosterData?.roster) {
                rosterPlayers = rosterData.roster.players?.[0]?.player || rosterData.roster.players || [];
        }
        
        const players = rosterPlayers;
        
        const playerIds = players.map(player => {
                const p = Array.isArray(player) && player.length > 0 ? player[0] : player;
                return p?.player_key || p?.player_id || null;
        }).filter(id => id !== null);
        
        const starters = players
                .filter(player => {
                        const p = Array.isArray(player) && player.length > 1 ? player[1] : player;
                        const selectedPosition = p?.selected_position?.[0]?.position || p?.selected_position;
                        return selectedPosition && selectedPosition !== 'BN' && selectedPosition !== 'IR';
                })
                .map(player => {
                        const p = Array.isArray(player) && player.length > 0 ? player[0] : player;
                        return p?.player_key || p?.player_id || null;
                })
                .filter(id => id !== null);
        
        const stats = teamStandings;
        const outcome_totals = stats.outcome_totals || {};

        // Use the canonical Yahoo team number (.t.N) as roster_id so it stays
        // consistent regardless of array order (e.g. when teams come from the
        // /standings fallback in rank order). Other adapters key off this number.
        const teamNum = parseInt(teamMeta.team_key?.match(/\.t\.(\d+)/)?.[1], 10);
        const canonicalRosterId = Number.isInteger(teamNum) ? teamNum : rosterId;

        return {
                roster_id: canonicalRosterId,
                owner_id: (!isHidden(managerData.guid) ? managerData.guid : null) || teamMeta.team_key || `yahoo_${rosterId}`,
                league_id: teamMeta.team_key?.split('.l.')[1]?.split('.t.')[0] || null,
                
                players: playerIds,
                starters: starters,
                reserve: [],
                taxi: null,
                
                settings: {
                        wins: parseInt(outcome_totals.wins || 0),
                        losses: parseInt(outcome_totals.losses || 0),
                        ties: parseInt(outcome_totals.ties || 0),
                        
                        fpts: parseFloat(stats.points_for || 0),
                        fpts_against: parseFloat(stats.points_against || 0),
                        fpts_decimal: parseFloat(stats.points_for || 0),
                        fpts_against_decimal: parseFloat(stats.points_against || 0),
                        
                        ppts: 0,
                        ppts_decimal: 0,
                        
                        waiver_position: parseInt(teamMeta.waiver_priority || 0),
                        waiver_budget_used: 0,
                        total_moves: parseInt(teamMeta.number_of_moves || 0),
                        
                        division: parseInt(teamMeta.division_id || 0) || null,
                        
                        record: `${outcome_totals.wins || 0}-${outcome_totals.losses || 0}${outcome_totals.ties ? `-${outcome_totals.ties}` : ''}`,
                },
                
                metadata: {
                        team_key: teamMeta.team_key,
                        team_name: teamMeta.name,
                        team_logo: teamMeta.team_logos?.[0]?.team_logo?.url || teamMeta.team_logo || null,
                        streak: stats.streak || null,
                        rank: parseInt(stats.rank || rosterId),
                        playoff_seed: parseInt(stats.playoff_seed || 0) || null,
                        // Pre-draft pick order (1 = first overall) once the commissioner
                        // sets it in Yahoo. Absent/0 until an order is assigned.
                        draft_position: parseInt(teamMeta.draft_position) || null
                },
                
                keepers: null,
                
                co_owners: null
                };
        } catch (error) {
                console.error('[Yahoo Adapter] Unexpected data structure in convertRosterToSleeperFormat:', error);
                console.error('Team data:', JSON.stringify(team, null, 2));
                console.error('Roster data:', JSON.stringify(rosterData, null, 2));
                return {
                        roster_id: rosterId,
                        owner_id: `yahoo_${rosterId}`,
                        league_id: null,
                        players: [],
                        starters: [],
                        reserve: [],
                        taxi: null,
                        settings: {
                                wins: 0,
                                losses: 0,
                                ties: 0,
                                fpts: 0,
                                fpts_against: 0,
                                fpts_decimal: 0,
                                fpts_against_decimal: 0,
                                ppts: 0,
                                ppts_decimal: 0,
                                waiver_position: 0,
                                waiver_budget_used: 0,
                                total_moves: 0,
                                division: null,
                                record: '0-0'
                        },
                        metadata: {},
                        keepers: null,
                        co_owners: null
                };
        }
}
