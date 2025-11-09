import { getYahooClient, withRetry } from './yahooClient.js';

export async function getYahooLeagueData(leagueKey) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const [leagueMeta, leagueSettings] = await Promise.all([
                withRetry(() => yf.league.meta(leagueKey)),
                withRetry(() => yf.league.settings(leagueKey))
        ]);

        return convertLeagueDataToSleeperFormat(leagueMeta, leagueSettings, leagueKey);
}

function convertLeagueDataToSleeperFormat(meta, settings, leagueKey) {
        try {
                const yahooLeague = meta.league?.[0] || meta;
                const yahooSettings = settings.league?.[0]?.settings?.[0] || settings.settings?.[0] || {};

                return {
                league_id: leagueKey,
                name: yahooLeague.name || '',
                season: yahooLeague.season || new Date().getFullYear().toString(),
                season_type: 'regular',
                status: getSleeperStatus(yahooLeague.draft_status),
                sport: 'nfl',
                
                settings: {
                        num_teams: yahooLeague.num_teams || 0,
                        playoff_week_start: yahooSettings.playoff_start_week || 15,
                        playoff_teams: yahooSettings.num_playoff_teams || 6,
                        playoff_round_type: 0,
                        playoff_seed_type: 0,
                        playoff_type: 0,
                        
                        daily_waivers: 0,
                        daily_waivers_days: 0,
                        daily_waivers_hour: 0,
                        daily_waivers_last_ran: 0,
                        
                        leg: 1,
                        max_keepers: 0,
                        offseason_adds: 0,
                        pick_trading: yahooSettings.trade_draft_picks ? 1 : 0,
                        
                        reserve_allow_cov: 0,
                        reserve_allow_dnr: 0,
                        reserve_allow_doubtful: 0,
                        reserve_allow_na: 0,
                        reserve_allow_out: 0,
                        reserve_allow_sus: 0,
                        reserve_slots: 0,
                        
                        taxi_allow_vets: 0,
                        taxi_deadline: 0,
                        taxi_slots: 0,
                        taxi_years: 0,
                        
                        trade_deadline: yahooSettings.trade_end_date || 0,
                        trade_review_days: yahooSettings.trade_review_days || 0,
                        
                        veto_auto_poll: 0,
                        veto_show_votes: 0,
                        veto_votes_needed: 0,
                        
                        waiver_bid_min: yahooSettings.waiver_rule === 'faab' ? 0 : null,
                        waiver_budget: yahooSettings.faab_balance || 0,
                        waiver_clear_days: 1,
                        waiver_day_of_week: 3,
                        waiver_type: getWaiverType(yahooSettings.waiver_rule),
                },
                
                scoring_settings: convertScoringSettings(yahooSettings.stat_categories),
                
                roster_positions: convertRosterPositions(yahooSettings.roster_positions),
                
                previous_league_id: null,
                
                total_rosters: yahooLeague.num_teams || 0,
                
                shard: 0,
                last_transaction_id: 0,
                last_message_id: 0,
                last_author_id: 0,
                last_author_display_name: '',
                last_author_avatar: null,
                last_author_is_bot: false,
                last_pinned_message_id: 0,
                last_message_time: 0,
                last_message_text_map: null,
                last_message_attachment: null,
                last_read_id: null,
                last_message_id: null,
                
                draft_id: yahooLeague.draft_id || null,
                avatar: yahooLeague.logo_url || null,
                
                metadata: {
                        yahoo_league_key: leagueKey,
                        yahoo_game_key: yahooLeague.game_key || '',
                        scoring_type: yahooSettings.scoring_type || 'head_to_head',
                        max_teams: yahooSettings.max_teams || yahooLeague.num_teams,
                        league_type: yahooSettings.is_pro_league ? 'pro' : 'custom'
                }
                };
        } catch (error) {
                console.error('[Yahoo Adapter] Unexpected data structure in convertLeagueDataToSleeperFormat:', error);
                console.error('League meta:', JSON.stringify(meta, null, 2));
                console.error('League settings:', JSON.stringify(settings, null, 2));
                return {
                        league_id: leagueKey,
                        name: 'Unknown League',
                        season: new Date().getFullYear().toString(),
                        season_type: 'regular',
                        status: 'pre_draft',
                        sport: 'nfl',
                        settings: {
                                num_teams: 0,
                                playoff_week_start: 15,
                                playoff_teams: 6
                        },
                        scoring_settings: {},
                        roster_positions: [],
                        total_rosters: 0,
                        metadata: {
                                yahoo_league_key: leagueKey
                        }
                };
        }
}

function getSleeperStatus(draftStatus) {
        const statusMap = {
                'predraft': 'pre_draft',
                'inprogress': 'drafting',
                'postdraft': 'in_season',
                'complete': 'complete'
        };
        return statusMap[draftStatus] || 'pre_draft';
}

function getWaiverType(waiverRule) {
        const typeMap = {
                'faab': 2,
                'continual': 0,
                'gametime': 1
        };
        return typeMap[waiverRule] || 0;
}

function convertScoringSettings(statCategories) {
        if (!statCategories?.stats?.stat) return {};
        
        const stats = Array.isArray(statCategories.stats.stat) 
                ? statCategories.stats.stat 
                : [statCategories.stats.stat];
        
        const scoringMap = {};
        
        const yahooToSleeperStatMap = {
                '5': 'pass_yd',
                '6': 'pass_td',
                '7': 'pass_int',
                '9': 'rush_yd',
                '10': 'rush_td',
                '11': 'rec',
                '12': 'rec_yd',
                '13': 'rec_td',
                '15': 'st_td',
                '16': 'st_ff',
                '18': 'fum_lost',
                '19': 'fg_made',
                '20': 'fg_miss',
                '21': 'xp_made',
                '22': 'xp_miss',
                '32': 'def_td',
                '45': 'def_st_td',
                '57': 'fum_rec_td',
                '58': 'bonus_pass_yd_300',
                '59': 'bonus_pass_yd_400',
                '60': 'bonus_rush_yd_100',
                '61': 'bonus_rush_yd_200',
                '62': 'bonus_rec_yd_100',
                '63': 'bonus_rec_yd_200',
        };
        
        stats.forEach(stat => {
                const statId = stat.stat_id?.toString();
                const sleeperStat = yahooToSleeperStatMap[statId];
                if (sleeperStat && stat.value) {
                        scoringMap[sleeperStat] = parseFloat(stat.value);
                }
        });
        
        return scoringMap;
}

function convertRosterPositions(rosterPositions) {
        if (!rosterPositions?.roster_position) return [];
        
        const positions = Array.isArray(rosterPositions.roster_position)
                ? rosterPositions.roster_position
                : [rosterPositions.roster_position];
        
        const sleeperPositions = [];
        
        const yahooToSleeperPosMap = {
                'QB': 'QB',
                'RB': 'RB',
                'WR': 'WR',
                'TE': 'TE',
                'W/R': 'FLEX',
                'W/R/T': 'FLEX',
                'Q/W/R/T': 'SUPER_FLEX',
                'K': 'K',
                'DEF': 'DEF',
                'D': 'DEF',
                'BN': 'BN',
                'IR': 'IR'
        };
        
        positions.forEach(pos => {
                const position = pos.position || pos;
                const count = parseInt(pos.count || 1);
                const sleeperPos = yahooToSleeperPosMap[position] || position;
                
                for (let i = 0; i < count; i++) {
                        sleeperPositions.push(sleeperPos);
                }
        });
        
        return sleeperPositions;
}
