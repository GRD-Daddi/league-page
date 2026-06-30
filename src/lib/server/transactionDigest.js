import { query } from './db.js';

/**
 * Server-side transaction digestion for the /transactions page.
 *
 * The Yahoo adapter returns raw transactions keyed by Yahoo player_key with
 * roster ids only — the same "sleeper-shaped" payload the keeper engine consumes.
 * The transaction UI, however, expects fully DIGESTED transactions
 * ({ id, date, season, type, rosters, moves }) with each move's `player` field
 * being a key into the Sleeper-keyed player map the page renders from. This module
 * performs that digestion server-side (the original digest lived only in a
 * browser-coupled client helper), bridging Yahoo player ids to Sleeper ids and
 * building the team-manager lookup the components read team names/avatars from.
 */

const DEFAULT_TEAM_AVATAR = 'https://sleepercdn.com/images/v2/icons/player_default.webp';

// The digits after ".p." in a Yahoo player_key like "461.p.40114", or a bare
// numeric id. The game prefix changes every season, so the numeric id is the
// stable handle used to bridge to Sleeper.
function playerIdFromKey(playerKey) {
        const s = String(playerKey || '');
        const m = s.match(/\.p\.(\d+)/) || s.match(/^(\d+)$/);
        return m ? m[1] : null;
}

function rosterIdFromTeamKey(teamKey) {
        const m = String(teamKey || '').match(/\.t\.(\d+)/);
        return m ? Number(m[1]) : null;
}

// Map every Sleeper player id that carries a yahoo_id (`yh`) back to its Sleeper
// id, so a Yahoo transaction's player_key can resolve into the Sleeper-keyed
// player map the UI renders names, avatars, position and team from.
function buildYahooToSleeper(playersMap) {
        const map = {};
        for (const sid in playersMap) {
                const yh = playersMap[sid]?.yh;
                if (yh != null) map[String(yh)] = sid;
        }
        return map;
}

function splitName(full) {
        const s = String(full || '').trim();
        if (!s) return { fn: '', ln: '' };
        const i = s.indexOf(' ');
        if (i < 0) return { fn: s, ln: '' };
        return { fn: s.slice(0, i), ln: s.slice(i + 1) };
}

// Mirrors the client helper's date formatting so archived and live seasons read
// identically (kept byte-for-byte even where quirky, e.g. unpadded minutes).
function digestDate(tStamp) {
        const a = new Date(tStamp);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = a.getFullYear();
        const month = months[a.getMonth()];
        const date = a.getDate();
        const hour = a.getHours();
        const min = a.getMinutes();
        return month + ' ' + date + ' ' + year + ', ' + (hour % 12 == 0 ? 12 : hour % 12) + ':' + min + (hour / 12 >= 1 ? 'PM' : 'AM');
}

// Resolve a Yahoo player_key to the key the UI's player map is indexed by.
// Bridged players use their real Sleeper id (full name + avatar). Unbridged
// players (older Yahoo ids, team defenses) get a synthetic entry built from the
// name Yahoo ships directly on the transaction, so they still render readably.
function resolvePlayer(playerKey, meta, ctx) {
        const numeric = playerIdFromKey(playerKey);
        const sid = numeric != null ? ctx.bridge[numeric] : null;
        if (sid && ctx.players[sid]) return sid;

        const key = `yh_${numeric || playerKey}`;
        if (!ctx.patch[key]) {
                const { fn, ln } = splitName(meta?.name);
                ctx.patch[key] = {
                        fn: fn || 'Unknown',
                        ln: ln || '',
                        pos: meta?.pos || '',
                        t: meta?.team || ''
                };
        }
        return key;
}

// Build the per-roster move array for an added (or traded-in) player. Mirrors the
// client helper's handleAdds: a player that is also dropped represents a trade
// (in on one roster, "origin" on the other); otherwise a straight add.
function handleAdds(rosters, adds, drops, player, bid) {
        const move = new Array(rosters.length).fill(null);
        if (drops && drops[player] != null) {
                move[rosters.indexOf(adds[player])] = { type: 'trade', player };
                move[rosters.indexOf(drops[player])] = 'origin';
                return move;
        }
        move[rosters.indexOf(adds[player])] = { type: 'Added', player, bid };
        return move;
}

// Digest a single adapter-shape transaction into the UI shape. Returns null for
// failed waiver claims (which the UI must not show).
function digestOne(txn, ctx, season) {
        if (!txn || txn.status === 'failed') return null;

        const metaMap = txn.players_meta || {};
        const adds = {};
        const drops = {};
        for (const pk in (txn.adds || {})) {
                adds[resolvePlayer(pk, metaMap[pk], ctx)] = txn.adds[pk];
        }
        for (const pk in (txn.drops || {})) {
                drops[resolvePlayer(pk, metaMap[pk], ctx)] = txn.drops[pk];
        }

        const draftPicks = Array.isArray(txn.draft_picks) ? txn.draft_picks : [];
        const waiverBudget = Array.isArray(txn.waiver_budget) ? txn.waiver_budget : [];

        const rosters = [...new Set([
                ...Object.values(adds),
                ...Object.values(drops),
                ...draftPicks.flatMap((p) => [p.owner_id, p.previous_owner_id])
        ].filter((id) => id != null))];

        const bid = txn.settings?.waiver_bid;
        const ts = txn.status_updated || txn.created || Date.now();

        const moves = [];
        const handled = [];

        for (const player in adds) {
                handled.push(player);
                moves.push(handleAdds(rosters, adds, drops, player, bid));
        }

        for (const player in drops) {
                if (handled.indexOf(player) > -1) continue;
                const move = new Array(rosters.length).fill(null);
                move[rosters.indexOf(drops[player])] = { type: 'Dropped', player };
                moves.push(move);
        }

        for (const pick of draftPicks) {
                const oi = rosters.indexOf(pick.owner_id);
                if (oi < 0) continue;
                const move = new Array(rosters.length).fill(null);
                move[oi] = {
                        type: 'trade',
                        pick: { season: pick.season, round: pick.round, original_owner: null }
                };
                if (pick.roster_id != pick.previous_owner_id) {
                        move[oi].pick.original_owner = pick.roster_id;
                }
                const pi = rosters.indexOf(pick.previous_owner_id);
                if (pi > -1) move[pi] = 'origin';
                moves.push(move);
        }

        for (const wb of waiverBudget) {
                const ri = rosters.indexOf(wb.receiver);
                if (ri < 0) continue;
                const move = new Array(rosters.length).fill(null);
                move[ri] = { type: 'trade', budget: { amount: wb.amount } };
                const si = rosters.indexOf(wb.sender);
                if (si > -1) move[si] = 'origin';
                moves.push(move);
        }

        return {
                id: txn.transaction_id,
                date: digestDate(ts),
                season,
                type: txn.type === 'trade' ? 'trade' : 'waiver',
                rosters,
                moves,
                _ts: ts
        };
}

/**
 * Digest an array of adapter-shape transactions for a single season. Returns the
 * digested transactions (newest first) plus a `playersPatch` of synthetic player
 * entries to merge into the page's player map so every referenced player renders.
 */
export function digestTransactions(adapterTxns, playersData, season) {
        const players = playersData?.players || {};
        const ctx = { bridge: buildYahooToSleeper(players), players, patch: {} };

        const out = [];
        for (const txn of (adapterTxns || [])) {
                const d = digestOne(txn, ctx, season);
                if (d) out.push(d);
        }
        out.sort((a, b) => (b._ts || 0) - (a._ts || 0));
        for (const d of out) delete d._ts;

        return { transactions: out, playersPatch: ctx.patch };
}

/**
 * Reconstruct adapter-shape transactions for a CLOSED season straight from the
 * durable `transaction_archive` table, so past seasons never depend on a live,
 * rate-limit-prone Yahoo fetch (enumerate seasons + one call per week). The
 * archive stores one row per player movement with the original Yahoo
 * transaction_id, type (add/drop/trade), the numeric player_key, the source
 * (from) and destination (to) roster ids, and a millisecond timestamp — exactly
 * enough to regroup into the same {adds, drops, type, created} adapter payload the
 * live Yahoo adapter produces. Player names are bridged later by digestOne via the
 * Sleeper players map (the archive intentionally stores only ids).
 *
 * Returns an array of adapter-shape transactions (the same shape digestTransactions
 * consumes), or an empty array when the year has no archived rows.
 */
// Player-name lookup (numeric Yahoo id -> { name, pos, team }) built from the
// durable roster archive, which stores fn/ln/pos/team keyed by Yahoo player_key.
// Cached briefly so repeated past-season views (filter/search/paging) don't rebuild
// it every request. This is the only Yahoo-free name source for ids Sleeper hasn't
// tagged; players absent here AND from Sleeper render as "Unknown".
let _nameDictCache = null;
let _nameDictAt = 0;
const NAME_DICT_TTL_MS = 5 * 60 * 1000;

async function buildArchiveNameDict() {
        const now = Date.now();
        if (_nameDictCache && now - _nameDictAt < NAME_DICT_TTL_MS) return _nameDictCache;
        const dict = {};
        try {
                const { rows } = await query(
                        `SELECT DISTINCT
                                regexp_replace(elem->>'key', '^.*\\.p\\.', '') AS pid,
                                elem->>'fn' AS fn, elem->>'ln' AS ln,
                                elem->>'pos' AS pos, elem->>'t' AS team
                         FROM roster_archive, jsonb_array_elements(players::jsonb) elem
                         WHERE players IS NOT NULL AND elem->>'key' IS NOT NULL`
                );
                for (const r of rows) {
                        if (!r.pid || dict[r.pid]) continue;
                        const name = [r.fn, r.ln].filter(Boolean).join(' ').trim();
                        if (!name) continue;
                        dict[r.pid] = { name, pos: r.pos || '', team: r.team || '' };
                }
        } catch (err) {
                console.error('[transactionDigest] name dictionary build failed:', err?.message);
        }
        _nameDictCache = dict;
        _nameDictAt = now;
        return dict;
}

export async function loadArchivedTransactions(year) {
        let rows;
        try {
                ({ rows } = await query(
                        `SELECT transaction_id, type, player_key, from_roster_id, to_roster_id, timestamp
                         FROM transaction_archive WHERE year = $1`,
                        [year]
                ));
        } catch (err) {
                console.error('[transactionDigest] archived transactions load failed:', err?.message);
                return [];
        }

        // The archive stores no player names (only ids). digestOne bridges most ids to
        // the Sleeper player map, but Yahoo ids Sleeper hasn't tagged (recent churn
        // players, team defenses) would render as "Unknown". Hydrate a name lookup from
        // the durable roster archive (fn/ln/pos/team keyed by Yahoo player_key) and feed
        // it back as players_meta so digestOne's synthetic-entry fallback shows the real
        // name instead. Names not found here AND not in Sleeper remain "Unknown".
        const nameDict = await buildArchiveNameDict();

        const byId = new Map();
        for (const r of rows) {
                let txn = byId.get(r.transaction_id);
                if (!txn) {
                        txn = {
                                transaction_id: r.transaction_id,
                                status: 'complete',
                                type: 'waiver',
                                adds: {},
                                drops: {},
                                players_meta: {},
                                created: 0
                        };
                        byId.set(r.transaction_id, txn);
                }
                const pk = r.player_key;
                if (pk != null) {
                        const meta = nameDict[playerIdFromKey(pk)];
                        if (meta && !txn.players_meta[pk]) txn.players_meta[pk] = meta;
                        // A trade stores the same player on both sides (in on `to`, origin on
                        // `from`); digestOne treats a player present in BOTH adds & drops as a
                        // trade move. Add/drop waiver rows only ever populate one side.
                        if (r.type === 'trade') {
                                txn.type = 'trade';
                                if (r.to_roster_id != null) txn.adds[pk] = r.to_roster_id;
                                if (r.from_roster_id != null) txn.drops[pk] = r.from_roster_id;
                        } else if (r.type === 'add') {
                                if (r.to_roster_id != null) txn.adds[pk] = r.to_roster_id;
                        } else if (r.type === 'drop') {
                                if (r.from_roster_id != null) txn.drops[pk] = r.from_roster_id;
                        }
                }
                const ts = Number(r.timestamp);
                if (Number.isFinite(ts) && ts > txn.created) txn.created = ts;
        }

        for (const txn of byId.values()) {
                if (!txn.created) txn.created = Date.now();
        }
        return [...byId.values()];
}

/**
 * Build the team-manager lookup the transaction components read (team name +
 * avatar) from the durable season archive. Scoped to a single season: both the
 * season-specific and "current owner" lookups resolve to the same map, so no
 * misleading cross-season owner labels appear. Any roster referenced by a
 * transaction but missing from the archive is backfilled with a placeholder so
 * getTeamFromTeamManagers never throws mid-render.
 */
export async function buildTransactionTeamManagers(year, extraRosters = []) {
        const map = {};
        try {
                const { rows } = await query(
                        `SELECT team_key, team_name, manager_name, logo_url
                         FROM team_season_archive WHERE year = $1`,
                        [year]
                );
                for (const r of rows) {
                        const rid = rosterIdFromTeamKey(r.team_key);
                        if (rid == null) continue;
                        map[rid] = {
                                team: { name: r.team_name || `Team ${rid}`, avatar: r.logo_url || DEFAULT_TEAM_AVATAR },
                                managers: [r.manager_name].filter(Boolean),
                                roster: { roster_id: rid }
                        };
                }
        } catch (err) {
                console.error('[transactionDigest] team manager load failed:', err?.message);
        }

        for (const rid of extraRosters) {
                if (rid == null || map[rid]) continue;
                map[rid] = {
                        team: { name: `Team ${rid}`, avatar: DEFAULT_TEAM_AVATAR },
                        managers: [],
                        roster: { roster_id: rid }
                };
        }

        return { currentSeason: year, teamManagersMap: { [year]: map } };
}
