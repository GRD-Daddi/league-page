import { getYahooClient } from './yahooClient.js';

export async function getYahooLeagueMatchups(leagueKey, week) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const scoreboard = await yf.league.scoreboard(leagueKey, week);
        
        return convertScoreboardToSleeperMatchups(scoreboard, week);
}

function convertScoreboardToSleeperMatchups(scoreboard, week) {
        const matchups = scoreboard.league?.[0]?.scoreboard?.[0]?.matchups || 
                        scoreboard.scoreboard?.matchups || [];
        
        const sleeperMatchups = [];
        let matchupId = 1;
        
        matchups.forEach(matchup => {
                const matchupData = matchup.matchup?.[0] || matchup;
                const teams = matchupData.teams || [];
                
                teams.forEach((teamWrapper, index) => {
                        let teamMeta = {};
                        let teamPoints = {};
                        let teamProjectedPoints = {};
                        let roster = {};
                        
                        if (teamWrapper.team && Array.isArray(teamWrapper.team)) {
                                teamWrapper.team.forEach(segment => {
                                        if (segment.team_key) {
                                                teamMeta = {...teamMeta, ...segment};
                                        }
                                        if (segment.team_points) {
                                                teamPoints = segment.team_points;
                                        }
                                        if (segment.team_projected_points) {
                                                teamProjectedPoints = segment.team_projected_points;
                                        }
                                        if (segment.roster) {
                                                roster = segment.roster;
                                        }
                                });
                        } else {
                                teamMeta = teamWrapper.team || teamWrapper;
                                teamPoints = teamMeta.team_points || {};
                                teamProjectedPoints = teamMeta.team_projected_points || {};
                                roster = teamMeta.roster || {};
                        }
                        
                        const teamKey = teamMeta.team_key;
                        const rosterIdMatch = teamKey?.match(/\.t\.(\d+)/);
                        const rosterId = rosterIdMatch ? parseInt(rosterIdMatch[1]) : null;
                        
                        if (!rosterId) return;
                        
                        const points = parseFloat(teamPoints.total || 0);
                        const projected = parseFloat(teamProjectedPoints.total || 0);
                        
                        const players = roster.players?.[0]?.player || roster.players || [];
                        
                        const starterIds = players
                                .filter(player => {
                                        const p = Array.isArray(player) && player.length > 1 ? player[1] : player;
                                        const selectedPosition = p?.selected_position?.[0]?.position || p?.selected_position;
                                        return selectedPosition && selectedPosition !== 'BN' && selectedPosition !== 'IR';
                                })
                                .map(player => {
                                        const p = Array.isArray(player) && player.length > 0 ? player[0] : player;
                                        return p?.player_key || p?.player_id;
                                })
                                .filter(id => id);
                        
                        const playerPoints = {};
                        const playersPoints = {};
                        
                        players.forEach(player => {
                                const pData = Array.isArray(player) && player.length > 0 ? player[0] : player;
                                const pStats = Array.isArray(player) && player.length > 1 ? player[1] : player;
                                const playerId = pData?.player_key || pData?.player_id;
                                
                                if (!playerId) return;
                                
                                const points = parseFloat(pStats?.player_points?.total || 0);
                                playerPoints[playerId] = points;
                                playersPoints[playerId] = {
                                        pts: points,
                                        proj: parseFloat(pStats?.player_projected_points?.total || 0)
                                };
                        });
                        
                        sleeperMatchups.push({
                                roster_id: rosterId,
                                matchup_id: matchupId,
                                points: points,
                                players_points: playersPoints,
                                starters: starterIds,
                                starters_points: starterIds.map(id => playerPoints[id] || 0),
                                players: Object.keys(playerPoints),
                                custom_points: null
                        });
                });
                
                matchupId++;
        });
        
        return sleeperMatchups;
}

export async function getYahooNFLState() {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        let season = currentYear;
        let seasonType = 'regular';
        let week = 1;
        
        if (currentMonth >= 9 || currentMonth <= 2) {
                if (currentMonth <= 2) {
                        season = currentYear - 1;
                }
                
                if (currentMonth === 9) {
                        week = 1;
                } else if (currentMonth === 10) {
                        week = 5;
                } else if (currentMonth === 11) {
                        week = 9;
                } else if (currentMonth === 12) {
                        week = 13;
                        if (currentDate.getDate() > 20) {
                                week = 17;
                        }
                } else if (currentMonth === 1) {
                        seasonType = 'post';
                        week = 18;
                } else if (currentMonth === 2) {
                        seasonType = 'post';
                        week = 20;
                }
        } else {
                seasonType = 'off';
                week = 0;
        }
        
        return {
                week: week.toString(),
                season_type: seasonType,
                season: season.toString(),
                league_season: season.toString(),
                previous_season: (season - 1).toString(),
                leg: 1,
                league_create_season: season.toString(),
                display_week: week
        };
}
