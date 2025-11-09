import { getYahooClient } from './yahooClient.js';

export async function getYahooDraftResults(leagueKey) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const draftResults = await yf.league.draft_results(leagueKey);
        
        return convertDraftResultsToSleeperFormat(draftResults, leagueKey);
}

export async function getYahooDraftData(leagueKey) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const [draftResults, leagueMeta] = await Promise.all([
                yf.league.draft_results(leagueKey),
                yf.league.meta(leagueKey)
        ]);
        
        const league = leagueMeta.league?.[0] || leagueMeta;
        
        return {
                draft_id: league.draft_id || `${leagueKey}_draft`,
                type: 'snake',
                status: getDraftStatus(league.draft_status),
                sport: 'nfl',
                season: league.season || new Date().getFullYear().toString(),
                season_type: 'regular',
                
                settings: {
                        slots_wr: 0,
                        slots_rb: 0,
                        slots_qb: 0,
                        slots_te: 0,
                        slots_k: 0,
                        slots_def: 0,
                        slots_bn: 0,
                        slots_flex: 0,
                        
                        rounds: parseInt(league.num_draft_rounds || 15),
                        pick_timer: parseInt(league.draft_pick_time || 90),
                        
                        reversal_round: 0,
                        teams: parseInt(league.num_teams || 10),
                        alpha_sort: 0,
                        
                        cpu_autopick: 1,
                        enforce_position_limits: 1
                },
                
                start_time: league.draft_time ? new Date(league.draft_time * 1000).getTime() : null,
                
                league_id: leagueKey,
                last_picked: 0,
                last_message_time: 0,
                last_message_id: null,
                
                metadata: {
                        yahoo_league_key: leagueKey,
                        draft_type: league.draft_type || 'live',
                        is_editable: league.edit_key ? 1 : 0
                },
                
                creators: null,
                draft_order: null
        };
}

function getDraftStatus(draftStatus) {
        const statusMap = {
                'predraft': 'pre_draft',
                'inprogress': 'in_progress',
                'postdraft': 'complete',
                'complete': 'complete'
        };
        return statusMap[draftStatus] || 'pre_draft';
}

function convertDraftResultsToSleeperFormat(draftResults, leagueKey) {
        const picks = draftResults.league?.[0]?.draft_results?.[0]?.draft_result || 
                      draftResults.draft_results || [];
        
        return picks.map(pick => {
                const pickData = Array.isArray(pick) ? pick[0] : pick;
                
                const teamKey = pickData.team_key || '';
                const rosterIdMatch = teamKey.match(/\.t\.(\d+)/);
                const rosterId = rosterIdMatch ? parseInt(rosterIdMatch[1]) : null;
                
                const pickNum = parseInt(pickData.pick || 0);
                const round = parseInt(pickData.round || 0);
                
                return {
                        player_id: pickData.player_key || pickData.player_id,
                        picked_by: rosterId ? rosterId.toString() : null,
                        roster_id: rosterId,
                        
                        round: round,
                        draft_slot: rosterId,
                        pick_no: pickNum,
                        
                        metadata: {
                                yahoo_player_key: pickData.player_key,
                                team_key: teamKey,
                                cost: pickData.cost || null,
                                is_keeper: pickData.is_keeper === '1'
                        },
                        
                        is_keeper: pickData.is_keeper === '1' ? true : null,
                        
                        draft_id: `${leagueKey}_draft`
                };
        });
}

export async function getYahooTradedPicks(leagueKey) {
        return [];
}
