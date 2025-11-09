import { getYahooClient } from './yahooClient.js';

export async function getYahooPlayers(leagueKey, playerKeys = null) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        if (playerKeys && playerKeys.length > 0) {
                const playerPromises = playerKeys.map(key => 
                        yf.player.meta(key).catch(err => {
                                console.error(`Error fetching player ${key}:`, err);
                                return null;
                        })
                );
                const players = await Promise.all(playerPromises);
                return players.filter(p => p !== null).map(p => convertPlayerToSleeperFormat(p));
        }
        
        const leaguePlayers = await yf.league.players(leagueKey);
        const playersArray = leaguePlayers.league?.[0]?.players?.[0]?.player || 
                             leaguePlayers.players || [];
        
        return playersArray.map(p => convertPlayerToSleeperFormat(p));
}

export async function getYahooPlayerStats(leagueKey, playerKey, week = null) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        try {
                const stats = week 
                        ? await yf.player.stats(playerKey, week)
                        : await yf.player.stats(playerKey);
                
                return convertPlayerStatsToSleeperFormat(stats, playerKey);
        } catch (err) {
                console.error(`Error fetching stats for player ${playerKey}:`, err);
                return {};
        }
}

function convertPlayerToSleeperFormat(playerData) {
        const player = Array.isArray(playerData) && playerData.length > 0 ? playerData[0] : playerData;
        
        const name = player.name || {};
        const firstName = name.first || '';
        const lastName = name.last || '';
        const fullName = name.full || `${firstName} ${lastName}`.trim();
        
        return {
                player_id: player.player_key || player.player_id,
                
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                
                position: player.display_position || player.primary_position || 'NA',
                team: player.editorial_team_abbr || null,
                
                status: player.status || 'Active',
                injury_status: player.injury_note ? 'Questionable' : null,
                
                number: player.uniform_number ? parseInt(player.uniform_number) : null,
                
                age: null,
                height: player.height || null,
                weight: player.weight || null,
                
                college: player.college || null,
                
                years_exp: player.experience ? parseInt(player.experience) : null,
                
                fantasy_positions: [player.display_position || player.primary_position || 'NA'],
                
                metadata: {
                        yahoo_player_key: player.player_key,
                        yahoo_player_id: player.player_id,
                        editorial_team_full_name: player.editorial_team_full_name || null,
                        headshot_url: player.headshot?.url || player.image_url || null,
                        bye_week: player.bye_weeks?.week ? parseInt(player.bye_weeks.week) : null,
                        is_undroppable: player.is_undroppable === '1',
                        position_type: player.position_type || 'O'
                },
                
                sport: 'nfl',
                active: player.status !== 'NA',
                
                search_rank: player.average_draft_position ? parseInt(player.average_draft_position) : 9999,
                depth_chart_order: null,
                depth_chart_position: null,
                
                swish_id: null,
                espn_id: player.player_id ? parseInt(player.player_id) : null,
                yahoo_id: player.player_id ? parseInt(player.player_id) : null,
                rotowire_id: null,
                stats_id: null,
                sportradar_id: null,
                fantasy_data_id: null,
                rotoworld_id: null,
                gsis_id: null,
                
                injury_start_date: null,
                injury_body_part: null,
                injury_notes: player.injury_note || null,
                
                birth_date: null,
                birth_city: null,
                birth_state: null,
                birth_country: null,
                
                high_school: null,
                
                pandascore_esports_id: null
        };
}

function convertPlayerStatsToSleeperFormat(statsData, playerKey) {
        const player = statsData.player?.[0] || statsData;
        const stats = player.player_stats?.stats?.stat || player.stats || [];
        
        const sleeperStats = {};
        
        const yahooToSleeperStatMap = {
                '4': 'pass_att',
                '5': 'pass_yd',
                '6': 'pass_td',
                '7': 'pass_int',
                '8': 'pass_2pt',
                '9': 'rush_yd',
                '10': 'rush_td',
                '11': 'rec',
                '12': 'rec_yd',
                '13': 'rec_td',
                '14': 'rec_2pt',
                '15': 'st_td',
                '16': 'st_ff',
                '18': 'fum_lost',
                '19': 'fgm',
                '20': 'fgm_yds',
                '21': 'xpm',
                '30': 'rush_att',
                '31': 'rec_tgt'
        };
        
        const statsArray = Array.isArray(stats) ? stats : [stats];
        
        statsArray.forEach(stat => {
                const statId = stat.stat_id?.toString();
                const sleeperStat = yahooToSleeperStatMap[statId];
                if (sleeperStat && stat.value) {
                        sleeperStats[sleeperStat] = parseFloat(stat.value);
                }
        });
        
        return sleeperStats;
}

export async function getAllNFLPlayers() {
        return {};
}
