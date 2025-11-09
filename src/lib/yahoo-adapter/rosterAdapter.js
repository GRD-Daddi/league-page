import { getYahooClient } from './yahooClient.js';

export async function getYahooLeagueRosters(leagueKey) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const teams = await yf.league.teams(leagueKey);
        const teamsArray = teams.league?.[0]?.teams?.[0]?.team || teams.teams || [];
        
        const rosterPromises = teamsArray.map(async (team, index) => {
                const teamKey = team.team_key || team[0]?.team_key;
                if (!teamKey) return null;
                
                try {
                        const roster = await yf.team.roster(teamKey);
                        return convertRosterToSleeperFormat(team, roster, index + 1);
                } catch (err) {
                        console.error(`Error fetching roster for team ${teamKey}:`, err);
                        return convertRosterToSleeperFormat(team, null, index + 1);
                }
        });
        
        const rosters = await Promise.all(rosterPromises);
        return rosters.filter(r => r !== null);
}

export async function getYahooLeagueUsers(leagueKey) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const teams = await yf.league.teams(leagueKey);
        const teamsArray = teams.league?.[0]?.teams?.[0]?.team || teams.teams || [];
        
        return teamsArray.map((team, index) => {
                const teamData = Array.isArray(team) ? team[0] : team;
                const managers = teamData.managers || [];
                const manager = Array.isArray(managers) ? managers[0] : managers;
                const managerData = manager?.manager || manager || {};
                
                return {
                        user_id: managerData.guid || `yahoo_${index + 1}`,
                        username: managerData.nickname || teamData.name || `Team ${index + 1}`,
                        display_name: managerData.nickname || teamData.name || `Team ${index + 1}`,
                        avatar: managerData.image_url || null,
                        metadata: {
                                team_key: teamData.team_key,
                                team_name: teamData.name,
                                yahoo_guid: managerData.guid,
                                is_commissioner: managerData.is_commissioner === '1',
                                email: managerData.email || null
                        },
                        is_owner: managerData.is_commissioner === '1',
                        is_bot: false
                };
        });
}

function convertRosterToSleeperFormat(team, rosterData, rosterId) {
        let teamMeta = {};
        let teamStandings = {};
        let managers = [];
        
        if (Array.isArray(team)) {
                team.forEach(segment => {
                        if (segment.team_key) {
                                teamMeta = {...teamMeta, ...segment};
                        }
                        if (segment.team_standings || segment.standings) {
                                teamStandings = segment.team_standings || segment.standings || {};
                        }
                        if (segment.managers) {
                                managers = segment.managers;
                        }
                });
        } else {
                teamMeta = team;
                teamStandings = team.team_standings || team.standings || {};
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
        
        return {
                roster_id: rosterId,
                owner_id: managerData.guid || `yahoo_${rosterId}`,
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
                        playoff_seed: parseInt(stats.playoff_seed || 0) || null
                },
                
                keepers: null,
                
                co_owners: null
        };
}
