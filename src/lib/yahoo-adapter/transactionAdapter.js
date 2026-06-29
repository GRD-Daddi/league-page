import { getYahooClient, withRetry, rawYahooGet } from './yahooClient.js';
import { teamNumFromKey, collectionToArray } from './draftAdapter.js';

export async function getYahooLeagueTransactions(leagueKey, week = null, yahooClient = null) {
        const yf = yahooClient || getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const transactions = await withRetry(() => yf.league.transactions(leagueKey));

        // The yahoo-fantasy library's transaction mapper keeps only `players` and
        // silently drops the `picks` segment, so trades of draft picks would show up
        // empty. Fetch + parse the raw trade picks ourselves and merge them back in,
        // keyed by transaction. Failures here must never break the whole page.
        let picksByTx = new Map();
        try {
                picksByTx = await getTradedPicksByTransaction(leagueKey, yf);
        } catch (error) {
                console.error('[Yahoo Adapter] Could not load traded picks for transactions:', error.message);
        }

        return convertTransactionsToSleeperFormat(transactions, week, picksByTx);
}

// Parse traded draft picks from the raw trades endpoint, grouped per transaction
// key, in Sleeper's draft_picks shape. Yahoo does not stamp a draft season on a
// traded pick, so we approximate it with the YEAR the trade happened (picks are
// almost always dealt for an upcoming draft) — purely for display.
async function getTradedPicksByTransaction(leagueKey, yf) {
        const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions;types=trade`;
        const raw = await withRetry(() => rawYahooGet(url, yf));

        const byTx = new Map();
        const league = raw?.fantasy_content?.league;
        const txContainer = Array.isArray(league)
                ? league.find((seg) => seg && seg.transactions)?.transactions
                : league?.transactions;
        const txs = collectionToArray(txContainer);

        for (const txWrap of txs) {
                const txRaw = txWrap?.transaction;
                const segments = Array.isArray(txRaw)
                        ? txRaw
                        : (txRaw && typeof txRaw === 'object' ? collectionToArray(txRaw) : []);
                if (segments.length === 0) continue;

                const meta = segments.find((seg) => seg && seg.transaction_key)
                        || segments.find((seg) => seg && seg.type)
                        || segments[0] || {};
                if ((meta.type || '') !== 'trade') continue;
                const status = meta.status || '';
                if (status && status !== 'successful' && status !== 'complete') continue;
                const txKey = meta.transaction_key;
                if (!txKey) continue;

                const year = meta.timestamp
                        ? new Date(parseInt(meta.timestamp) * 1000).getFullYear()
                        : null;

                const content = segments.find((seg) => seg && seg.picks) || {};
                const picks = collectionToArray(content.picks);

                const out = [];
                for (const pWrap of picks) {
                        const pick = pWrap?.pick || pWrap;
                        if (!pick) continue;
                        const round = parseInt(pick.round || 0);
                        const roster_id = teamNumFromKey(pick.original_team_key);
                        const owner_id = teamNumFromKey(pick.destination_team_key);
                        const previous_owner_id = teamNumFromKey(pick.source_team_key) ?? roster_id;
                        if (!round || roster_id == null || owner_id == null) continue;
                        out.push({
                                season: year ? String(year) : null,
                                round,
                                roster_id,
                                owner_id,
                                previous_owner_id
                        });
                }

                if (out.length) byTx.set(txKey, out);
        }

        return byTx;
}

function convertTransactionsToSleeperFormat(transactions, filterWeek = null, picksByTx = new Map()) {
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
                        return convertSingleTransaction(transData, picksByTx);
                });
}

function convertSingleTransaction(trans, picksByTx = new Map()) {
        try {
                const type = trans.type || '';
                const status = trans.status || 'complete';
                const timestamp = trans.timestamp ? parseInt(trans.timestamp) * 1000 : Date.now();
                
                const players = trans.players?.[0]?.player || trans.players || [];
        
        const adds = {};
        const drops = {};
        const draftPicks = picksByTx.get(trans.transaction_key) || [];
        const waiverBudget = [];
        // Yahoo includes the player's display name/position/team directly on the
        // transaction payload, so we capture it here (keyed by player_key) rather
        // than bridging to a separate player map. Lets consumers render readable
        // names without a second lookup.
        const playersMeta = {};
        
        players.forEach(playerWrapper => {
                const player = Array.isArray(playerWrapper) ? playerWrapper[0] : playerWrapper;
                const transactionData = Array.isArray(playerWrapper)
                        ? playerWrapper[1]?.transaction_data?.[0]
                        : (playerWrapper.transaction || playerWrapper.transaction_data);
                
                const playerId = player.player_key || player.player_id;
                if (playerId) {
                        const rawName = player.name;
                        const fullName = typeof rawName === 'object'
                                ? (rawName?.full || [rawName?.first, rawName?.last].filter(Boolean).join(' '))
                                : rawName;
                        playersMeta[playerId] = {
                                name: fullName || null,
                                pos: player.display_position || player.primary_position || null,
                                team: player.editorial_team_abbr || player.editorial_team_full_name || null
                        };
                }
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
                const addTeam = (rosterId) => {
                        if (rosterId != null && !consenterIds.includes(rosterId)) {
                                consenterIds.push(rosterId);
                        }
                };
                Object.values(adds).forEach(addTeam);
                Object.values(drops).forEach(addTeam);
                // Pick-only trades have no player adds/drops — make sure the teams that
                // swapped picks still count as participants.
                draftPicks.forEach(p => { addTeam(p.owner_id); addTeam(p.previous_owner_id); });
        }
        
        return {
                transaction_id: trans.transaction_key || trans.transaction_id || `yahoo_${timestamp}`,
                type: sleeperType,
                status: status === 'successful' ? 'complete' : status,
                
                adds: adds,
                drops: drops,
                draft_picks: draftPicks,
                waiver_budget: waiverBudget,
                players_meta: playersMeta,
                
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
                roster_ids: [...new Set([
                        ...Object.values(adds),
                        ...Object.values(drops),
                        ...draftPicks.flatMap(p => [p.owner_id, p.previous_owner_id])
                ].filter(id => id != null))]
                };
        } catch (error) {
                console.error('[Yahoo Adapter] Unexpected data structure in convertSingleTransaction:', error);
                console.error('Transaction data:', JSON.stringify(trans, null, 2));
                return {
                        transaction_id: `yahoo_${Date.now()}`,
                        type: 'free_agent',
                        status: 'complete',
                        adds: {},
                        drops: {},
                        draft_picks: [],
                        waiver_budget: [],
                        settings: { waiver_bid: 0, seq: 0 },
                        creator: null,
                        consenter_ids: [],
                        created: Date.now(),
                        status_updated: Date.now(),
                        metadata: {},
                        leg: 1,
                        roster_ids: []
                };
        }
}
