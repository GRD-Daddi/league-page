import { getYahooClient } from './yahooClient.js';

export async function getYahooLeagueTransactions(leagueKey, week = null) {
        const yf = getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const transactions = await yf.league.transactions(leagueKey);
        
        return convertTransactionsToSleeperFormat(transactions, week);
}

function convertTransactionsToSleeperFormat(transactions, filterWeek = null) {
        const transArray = transactions.league?.[0]?.transactions?.[0]?.transaction ||
                           transactions.transactions || [];
        
        return transArray
                .filter(trans => {
                        if (!filterWeek) return true;
                        const transData = Array.isArray(trans) && trans.length > 0 ? trans[0] : trans;
                        const transWeek = parseInt(transData?.week || 0);
                        return transWeek === filterWeek;
                })
                .map(trans => {
                        const transData = Array.isArray(trans) && trans.length > 0 ? trans[0] : trans;
                        return convertSingleTransaction(transData);
                });
}

function convertSingleTransaction(trans) {
        const type = trans.type || '';
        const status = trans.status || 'complete';
        const timestamp = trans.timestamp ? parseInt(trans.timestamp) * 1000 : Date.now();
        
        const players = trans.players?.[0]?.player || trans.players || [];
        
        const adds = {};
        const drops = {};
        const draftPicks = [];
        const waiverBudget = [];
        
        players.forEach(playerWrapper => {
                const player = Array.isArray(playerWrapper) ? playerWrapper[0] : playerWrapper;
                const transactionData = Array.isArray(playerWrapper) ? playerWrapper[1]?.transaction_data?.[0] : playerWrapper.transaction_data;
                
                const playerId = player.player_key || player.player_id;
                const sourceType = transactionData?.source_type || '';
                const destType = transactionData?.destination_type || '';
                const sourceTeam = transactionData?.source_team_key;
                const destTeam = transactionData?.destination_team_key;
                
                if (destType === 'team' && destTeam) {
                        const rosterIdMatch = destTeam.match(/\.t\.(\d+)/);
                        const rosterId = rosterIdMatch ? parseInt(rosterIdMatch[1]) : null;
                        if (rosterId) adds[playerId] = rosterId;
                }
                
                if (sourceType === 'team' && sourceTeam) {
                        const rosterIdMatch = sourceTeam.match(/\.t\.(\d+)/);
                        const rosterId = rosterIdMatch ? parseInt(rosterIdMatch[1]) : null;
                        if (rosterId) drops[playerId] = rosterId;
                }
        });
        
        const settings = {
                waiver_bid: trans.faab_bid ? parseInt(trans.faab_bid) : 0,
                seq: 0
        };
        
        let sleeperType = 'free_agent';
        if (type === 'trade') {
                sleeperType = 'trade';
        } else if (type === 'add' || type === 'add/drop') {
                if (trans.faab_bid) {
                        sleeperType = 'waiver';
                } else {
                        sleeperType = 'free_agent';
                }
        } else if (type === 'drop') {
                sleeperType = 'free_agent';
        }
        
        const creator = trans.trader_team_key;
        const creatorRosterIdMatch = creator?.match(/\.t\.(\d+)/);
        const creatorRosterId = creatorRosterIdMatch ? parseInt(creatorRosterIdMatch[1]) : null;
        
        const consenterIds = [creatorRosterId].filter(id => id !== null);
        if (sleeperType === 'trade') {
                Object.values(adds).forEach(rosterId => {
                        if (rosterId && !consenterIds.includes(rosterId)) {
                                consenterIds.push(rosterId);
                        }
                });
                Object.values(drops).forEach(rosterId => {
                        if (rosterId && !consenterIds.includes(rosterId)) {
                                consenterIds.push(rosterId);
                        }
                });
        }
        
        return {
                transaction_id: trans.transaction_key || trans.transaction_id || `yahoo_${timestamp}`,
                type: sleeperType,
                status: status === 'successful' ? 'complete' : status,
                
                adds: adds,
                drops: drops,
                draft_picks: draftPicks,
                waiver_budget: waiverBudget,
                
                settings: settings,
                
                creator: creatorRosterId ? creatorRosterId.toString() : null,
                consenter_ids: consenterIds.map(id => id.toString()),
                
                created: timestamp,
                status_updated: timestamp,
                
                metadata: {
                        yahoo_transaction_key: trans.transaction_key,
                        yahoo_type: type,
                        notes: trans.note || null,
                        timestamp: trans.timestamp
                },
                
                leg: 1,
                roster_ids: [...new Set([...Object.values(adds), ...Object.values(drops)])]
        };
}
