import { query, getPool, initDb } from './db.js';
import { getCurrentSeasonYear } from './pot.js';
import { loadLeagueData, loadDraftResults, loadLeagueTransactions } from './dataLoaders.js';
import { getSeasonKeeperPlayerIds } from '$lib/yahoo-adapter/draftAdapter.js';

/**
 * Persistence for the keeper engine: durable draft-pick history and a
 * decomposed per-player transaction log. Both feed keeperEngine.js, which
 * replays a player's acquisition timeline to determine keeper eligibility.
 *
 * player_id is the stable numeric Yahoo id — the digits after ".p." in a
 * player_key like "449.p.31883". The game prefix ("449.") changes every season,
 * so lineage tracking must key on the numeric id, never the full key.
 */
export function playerIdFromKey(playerKey) {
        const s = String(playerKey || '');
        const m = s.match(/\.p\.(\d+)/) || s.match(/^(\d+)$/);
        return m ? m[1] : null;
}

/**
 * Persist a season's draft results (authoritative — replaces any prior rows for
 * that year). Accepts the sleeper-shaped picks returned by loadDraftResults:
 * { player_id (= player_key), round, pick_no, roster_id, is_keeper,
 *   metadata: { team_key, is_keeper, cost } }.
 */
export async function saveDraftResults(year, leagueKey, picks, keeperIds = null) {
        if (!Number.isFinite(year) || !Array.isArray(picks) || picks.length === 0) return 0;
        await initDb();
        const client = await getPool().connect();
        let saved = 0;
        try {
                await client.query('BEGIN');
                await client.query('DELETE FROM draft_results_archive WHERE year = $1', [year]);
                for (const p of picks) {
                        const playerKey = p?.player_id || p?.metadata?.yahoo_player_key || null;
                        if (!playerKey) continue;
                        const playerId = playerIdFromKey(playerKey);
                        const round = parseInt(p?.round, 10) || null;
                        const pickNo = parseInt(p?.pick_no, 10) || null;
                        const teamKey = p?.metadata?.team_key || null;
                        const rosterId = Number.isFinite(p?.roster_id)
                                ? p.roster_id
                                : (parseInt(p?.roster_id, 10) || null);
                        const isKeeper = keeperIds
                                ? keeperIds.has(playerId)
                                : !!(p?.metadata?.is_keeper || p?.is_keeper);
                        const cost = p?.metadata?.cost != null ? (parseInt(p.metadata.cost, 10) || null) : null;
                        const playerName = p?.metadata?.player_name || p?.player_name || null;
                        await client.query(
                                `INSERT INTO draft_results_archive
                                        (year, league_key, round, pick_no, player_key, player_id, player_name, team_key, roster_id, is_keeper, cost, captured_at)
                                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
                                 ON CONFLICT (year, player_key) DO UPDATE SET
                                        league_key = EXCLUDED.league_key, round = EXCLUDED.round, pick_no = EXCLUDED.pick_no,
                                        player_id = EXCLUDED.player_id, player_name = COALESCE(EXCLUDED.player_name, draft_results_archive.player_name),
                                        team_key = EXCLUDED.team_key, roster_id = EXCLUDED.roster_id,
                                        is_keeper = EXCLUDED.is_keeper, cost = EXCLUDED.cost, captured_at = now()`,
                                [year, leagueKey || null, round, pickNo, playerKey, playerId, playerName, teamKey, rosterId, isKeeper, cost]
                        );
                        saved++;
                }
                await client.query('COMMIT');
        } catch (err) {
                await client.query('ROLLBACK');
                throw err;
        } finally {
                client.release();
        }
        return saved;
}

/**
 * Persist a league's transactions as per-player events (idempotent upserts).
 * Accepts the sleeper-shaped transactions from loadLeagueTransactions:
 * { transaction_id, type: 'trade'|'waiver'|'free_agent', adds: {player_key: rosterId},
 *   drops: {player_key: rosterId}, created (ms) }.
 *
 * Decomposition rule:
 *  - trade: every involved player (add and/or drop side) → a 'trade' event so the
 *    keeper lineage carries to the new owner (a trade never breaks lineage).
 *  - non-trade: each added player → 'add' (waiver/FA pickup, fresh lineage at
 *    round-6 cost); each dropped player → 'drop' (lineage break / reset).
 */
export async function saveTransactions(transactions) {
        if (!Array.isArray(transactions) || transactions.length === 0) return 0;

        const events = [];
        for (const t of transactions) {
                if (!t) continue;
                const created = Number(t.created) || Date.now();
                const year = getCurrentSeasonYear(new Date(created));
                const txId = String(t.transaction_id || `yahoo_${created}`);
                const adds = t.adds || {};
                const drops = t.drops || {};
                if (t.type === 'trade') {
                        const keys = new Set([...Object.keys(adds), ...Object.keys(drops)]);
                        for (const pk of keys) {
                                events.push({
                                        txId, year, type: 'trade', playerKey: pk,
                                        from: drops[pk] ?? null, to: adds[pk] ?? null, ts: created
                                });
                        }
                } else {
                        for (const pk of Object.keys(adds)) {
                                events.push({ txId, year, type: 'add', playerKey: pk, from: null, to: adds[pk] ?? null, ts: created });
                        }
                        for (const pk of Object.keys(drops)) {
                                events.push({ txId, year, type: 'drop', playerKey: pk, from: drops[pk] ?? null, to: null, ts: created });
                        }
                }
        }
        if (events.length === 0) return 0;

        await initDb();
        const client = await getPool().connect();
        let saved = 0;
        try {
                await client.query('BEGIN');
                for (const e of events) {
                        const playerId = playerIdFromKey(e.playerKey);
                        const from = Number.isFinite(e.from) ? e.from : (parseInt(e.from, 10) || null);
                        const to = Number.isFinite(e.to) ? e.to : (parseInt(e.to, 10) || null);
                        await client.query(
                                `INSERT INTO transaction_archive
                                        (transaction_id, year, type, player_key, player_id, from_roster_id, to_roster_id, timestamp, captured_at)
                                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
                                 ON CONFLICT (transaction_id, player_key, type) DO UPDATE SET
                                        year = EXCLUDED.year, player_id = EXCLUDED.player_id,
                                        from_roster_id = EXCLUDED.from_roster_id, to_roster_id = EXCLUDED.to_roster_id,
                                        timestamp = EXCLUDED.timestamp, captured_at = now()`,
                                [e.txId, e.year, e.type, e.playerKey, playerId, from, to, e.ts]
                        );
                        saved++;
                }
                await client.query('COMMIT');
        } catch (err) {
                await client.query('ROLLBACK');
                throw err;
        } finally {
                client.release();
        }
        return saved;
}

export async function getDraftResultsArchive() {
        const { rows } = await query(
                `SELECT year, round, pick_no, player_key, player_id, player_name, team_key, roster_id, is_keeper, cost
                 FROM draft_results_archive
                 ORDER BY year ASC, round ASC, pick_no ASC`
        );
        return rows;
}

/**
 * The players ACTUALLY kept for a given season — the captured draft-results rows
 * flagged is_keeper. This is the read-only "what really happened" record the
 * Keepers page shows once the season is live (the draft has come and gone).
 */
export async function getKeptKeepers(year) {
        const { rows } = await query(
                `SELECT year, round, pick_no, player_key, player_id, player_name, team_key, roster_id, cost
                 FROM draft_results_archive
                 WHERE year = $1 AND is_keeper = true
                 ORDER BY team_key ASC, cost ASC NULLS LAST, round ASC`,
                [year]
        );
        return rows;
}

export async function getTransactionArchive() {
        const { rows } = await query(
                `SELECT transaction_id, year, type, player_key, player_id, from_roster_id, to_roster_id, timestamp
                 FROM transaction_archive
                 ORDER BY timestamp ASC`
        );
        return rows;
}

export async function getArchiveStats() {
        const drafts = await query(
                `SELECT COUNT(*)::int AS picks, COUNT(DISTINCT year)::int AS seasons,
                        MIN(year) AS min_year, MAX(year) AS max_year
                 FROM draft_results_archive`
        );
        const tx = await query(
                `SELECT COUNT(*)::int AS events, COUNT(DISTINCT year)::int AS seasons
                 FROM transaction_archive`
        );
        return { drafts: drafts.rows[0] || {}, transactions: tx.rows[0] || {} };
}

/**
 * Best-effort capture of the CURRENT league key's draft + transactions. Used as a
 * fire-and-forget snapshot on page load so the keeper engine has fresh data
 * without requiring a manual backfill every season.
 */
export async function captureKeeperData(yahooClient, leagueKey) {
        if (!yahooClient || !leagueKey) return;
        try {
                const leagueData = await loadLeagueData(yahooClient, leagueKey);
                const year = parseInt(leagueData?.season, 10);
                if (Number.isFinite(year)) {
                        const picks = await loadDraftResults(yahooClient, leagueKey);
                        if (Array.isArray(picks) && picks.length) {
                                let keeperIds = null;
                                try {
                                        keeperIds = await getSeasonKeeperPlayerIds(leagueKey, yahooClient);
                                } catch (err) {
                                        console.error('[keeperArchive] keeper flags failed:', err?.message);
                                }
                                if (keeperIds) {
                                        await saveDraftResults(year, leagueKey, picks, keeperIds);
                                } else {
                                        console.warn('[keeperArchive] skipping draft save for', year, '— keeper flags unavailable');
                                }
                        }
                }
        } catch (err) {
                console.error('[keeperArchive] draft capture failed:', err?.message);
        }
        try {
                const tx = await loadLeagueTransactions(yahooClient, leagueKey);
                if (Array.isArray(tx) && tx.length) await saveTransactions(tx);
        } catch (err) {
                console.error('[keeperArchive] transaction capture failed:', err?.message);
        }
}

/**
 * Walk the Yahoo renew chain (previous_league_id) from the current league back
 * through every prior season, persisting each season's draft results and
 * transactions. Commissioner-triggered, since it makes many Yahoo calls.
 */
export async function backfillKeeperHistory(yahooClient, startLeagueKey) {
        if (!yahooClient || !startLeagueKey) {
                return { ok: false, error: 'Yahoo login is required to backfill keeper history.' };
        }

        let currentKey = startLeagueKey;
        let guard = 0;
        const seasons = [];
        let totalPicks = 0;
        let totalTx = 0;
        let totalKeepers = 0;

        while (currentKey && guard < 15) {
                guard++;
                let leagueData;
                try {
                        leagueData = await loadLeagueData(yahooClient, currentKey);
                } catch (err) {
                        console.error('[keeperBackfill] league load failed:', err?.message);
                        break;
                }
                if (!leagueData) break;

                const year = parseInt(leagueData.season, 10);
                if (Number.isFinite(year)) {
                        try {
                                let keeperIds = null;
                                try {
                                        keeperIds = await getSeasonKeeperPlayerIds(currentKey, yahooClient);
                                        totalKeepers += keeperIds.size;
                                } catch (err) {
                                        console.error('[keeperBackfill] keeper flags failed for', year, err?.message);
                                }
                                if (keeperIds) {
                                        const picks = await loadDraftResults(yahooClient, currentKey);
                                        if (Array.isArray(picks) && picks.length) {
                                                totalPicks += await saveDraftResults(year, currentKey, picks, keeperIds);
                                        }
                                } else {
                                        console.warn('[keeperBackfill] skipping draft save for', year, '— keeper flags unavailable');
                                }
                        } catch (err) {
                                console.error('[keeperBackfill] draft results failed for', year, err?.message);
                        }
                        try {
                                const tx = await loadLeagueTransactions(yahooClient, currentKey);
                                if (Array.isArray(tx) && tx.length) {
                                        totalTx += await saveTransactions(tx);
                                }
                        } catch (err) {
                                console.error('[keeperBackfill] transactions failed for', year, err?.message);
                        }
                        seasons.push(year);
                }

                currentKey = leagueData.previous_league_id || null;
        }

        return { ok: seasons.length > 0, seasons, picks: totalPicks, transactions: totalTx, keepers: totalKeepers };
}
