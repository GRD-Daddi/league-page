import { getYahooClient, withRetry } from './yahooClient.js';

export async function getYahooDraftResults(leagueKey, yahooClient = null) {
        const yf = yahooClient || getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const draftResults = await withRetry(() => yf.league.draft_results(leagueKey));
        
        return convertDraftResultsToSleeperFormat(draftResults, leagueKey);
}

export async function getYahooDraftData(leagueKey, yahooClient = null) {
        const yf = yahooClient || getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const [draftResults, leagueMeta] = await Promise.all([
                withRetry(() => yf.league.draft_results(leagueKey)),
                withRetry(() => yf.league.meta(leagueKey))
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
        try {
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
        } catch (error) {
                console.error('[Yahoo Adapter] Unexpected data structure in convertDraftResultsToSleeperFormat:', error);
                console.error('Draft results:', JSON.stringify(draftResults, null, 2));
                return [];
        }
}

// Extract the numeric Yahoo team number (the "N" in "...t.N") from a team key.
function teamNumFromKey(teamKey) {
        if (!teamKey || typeof teamKey !== 'string') return null;
        const m = teamKey.match(/\.t\.(\d+)/);
        return m ? parseInt(m[1]) : null;
}

// Yahoo collections come back as objects keyed "0","1",... plus a `count`.
// Normalize them to a plain array regardless of shape.
function collectionToArray(coll) {
        if (!coll) return [];
        if (Array.isArray(coll)) return coll;
        const out = [];
        const count = parseInt(coll.count ?? 0);
        if (count > 0) {
                for (let i = 0; i < count; i++) {
                        if (coll[i] !== undefined) out.push(coll[i]);
                }
        }
        if (out.length === 0) {
                for (const k of Object.keys(coll)) {
                        if (/^\d+$/.test(k)) out.push(coll[k]);
                }
        }
        return out;
}

// Traded draft picks are NOT exposed by the yahoo-fantasy library's transaction
// mapper (it only keeps `players`), so we hit the raw transactions endpoint and
// parse the `picks` segment ourselves. We replay every successful trade
// chronologically to compute the CURRENT owner of each (round, original team)
// pick for the upcoming draft. Returns net changes only (where ownership moved).
export async function getYahooTradedPicks(leagueKey, yahooClient = null) {
        const yf = yahooClient || getYahooClient();
        if (!yf) throw new Error('Yahoo client not initialized');

        const url = `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/transactions;types=trade`;
        const raw = await withRetry(() => yf.api('GET', url));

        const events = [];
        try {
                const league = raw?.fantasy_content?.league;
                const txContainer = Array.isArray(league)
                        ? league.find((seg) => seg && seg.transactions)?.transactions
                        : league?.transactions;
                const txs = collectionToArray(txContainer);

                let loggedShape = false;
                let tradeCount = 0;
                for (const txWrap of txs) {
                        // `transaction` is usually [meta, content] but can come back as an
                        // object collection in some leagues — normalize to a flat segment list.
                        const txRaw = txWrap?.transaction;
                        const segments = Array.isArray(txRaw)
                                ? txRaw
                                : (txRaw && typeof txRaw === 'object' ? collectionToArray(txRaw) : []);
                        if (segments.length === 0) continue;

                        const meta = segments.find((seg) => seg && seg.type) || segments[0] || {};
                        if ((meta.type || '') !== 'trade') continue;
                        const status = meta.status || '';
                        if (status && status !== 'successful' && status !== 'complete') continue;
                        tradeCount++;

                        const timestamp = parseInt(meta.timestamp || 0);
                        const content = segments.find((seg) => seg && seg.picks) || {};
                        const picks = collectionToArray(content.picks);

                        if (!loggedShape && picks.length > 0) {
                                console.log('[Yahoo Adapter] Sample traded-pick shape:', JSON.stringify(picks[0]));
                                loggedShape = true;
                        }

                        for (const pWrap of picks) {
                                const pick = pWrap?.pick || pWrap;
                                if (!pick) continue;
                                const round = parseInt(pick.round || 0);
                                const original = teamNumFromKey(pick.original_team_key);
                                const dest = teamNumFromKey(pick.destination_team_key);
                                const source = teamNumFromKey(pick.source_team_key);
                                if (!round || original == null || dest == null) continue;
                                events.push({ timestamp, round, original, dest, source });
                        }
                }

                if (tradeCount > 0 && events.length === 0) {
                        console.warn(
                                `[Yahoo Adapter] Found ${tradeCount} trade(s) but parsed 0 pick events — ` +
                                        'the Yahoo picks shape may differ from what is expected.'
                        );
                }
        } catch (error) {
                console.error('[Yahoo Adapter] Error parsing traded picks:', error.message);
        }

        events.sort((a, b) => a.timestamp - b.timestamp);

        // key "round:originalTeam" -> { owner, previous, round, original }
        const ownership = new Map();
        for (const ev of events) {
                const key = `${ev.round}:${ev.original}`;
                const prevOwner = ownership.has(key) ? ownership.get(key).owner : ev.original;
                ownership.set(key, {
                        round: ev.round,
                        original: ev.original,
                        owner: ev.dest,
                        previous: ev.source ?? prevOwner
                });
        }

        const result = [];
        for (const v of ownership.values()) {
                if (v.owner === v.original) continue;
                result.push({
                        round: v.round,
                        roster_id: v.original,
                        owner_id: v.owner,
                        previous_owner_id: v.previous
                });
        }
        return result;
}
