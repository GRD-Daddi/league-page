import { describe, it, expect, vi, beforeEach } from 'vitest';

// Locks in the privacy/correctness boundary of the opt-in /transactions cache:
//
//  1. _resolveSeasonLeagueKey / _loadAllTransactions only write to the cache when
//     BOTH an authenticated yahooClient AND a session-scoped key are present.
//  2. A null season-key (unresolvable / logged-out) and an empty transaction
//     result (possible auth error) are NEVER cached.
//  3. Two different session ids get isolated cache entries — one member's (or a
//     logged-out visitor's) payload is never served to another.
//
// enumerateLeagueSeasons and the Yahoo load helpers are mocked so we can count
// calls; the REAL in-memory cache (getCachedLeagueData/setCachedLeagueData) is
// kept via importActual so the test exercises the genuine caching code path.

const enumerateLeagueSeasons = vi.fn();
const loadLeagueData = vi.fn();
const loadLeagueTransactions = vi.fn();
const getTradedPicks = vi.fn();

vi.mock('$lib/server/historyBackfill.js', () => ({
        enumerateLeagueSeasons: (...args) => enumerateLeagueSeasons(...args)
}));

// Keep every real adapter export (dataLoaders imports several of them) and stub
// only the traded-pick fetcher so we can drive it without hitting Yahoo.
vi.mock('$lib/yahoo-adapter/transactionAdapter.js', async () => {
        const actual = await vi.importActual('$lib/yahoo-adapter/transactionAdapter.js');
        return { ...actual, getTradedPicksByTransaction: (...args) => getTradedPicks(...args) };
});

vi.mock('$lib/server/dataLoaders.js', async () => {
        const actual = await vi.importActual('$lib/server/dataLoaders.js');
        return {
                ...actual,
                loadLeagueData: (...args) => loadLeagueData(...args),
                loadLeagueTransactions: (...args) => loadLeagueTransactions(...args)
        };
});

const { _resolveSeasonLeagueKey, _loadAllTransactions, _attachTradedPicks } = await import('./+page.server.js');

// A fake authenticated client — the functions only check truthiness.
const client = { authed: true };

beforeEach(() => {
        vi.clearAllMocks();
        loadLeagueData.mockResolvedValue({ settings: { playoff_week_start: 2 } });
        loadLeagueTransactions.mockResolvedValue([{ type: 'trade' }]);
});

describe('_resolveSeasonLeagueKey caching boundary', () => {
        it('returns null and never enumerates when there is no yahooClient', async () => {
                const out = await _resolveSeasonLeagueKey(null, 2021, 'userA');
                expect(out).toBeNull();
                expect(enumerateLeagueSeasons).not.toHaveBeenCalled();
        });

        it('resolves but does NOT cache when no session scope is present (logged-out path)', async () => {
                enumerateLeagueSeasons.mockResolvedValue([{ year: 2021, leagueKey: 'nfl.l.111' }]);

                const first = await _resolveSeasonLeagueKey(client, 2021, null);
                const second = await _resolveSeasonLeagueKey(client, 2021, null);

                expect(first).toBe('nfl.l.111');
                expect(second).toBe('nfl.l.111');
                // No scope → no cache, so every call re-enumerates.
                expect(enumerateLeagueSeasons).toHaveBeenCalledTimes(2);
        });

        it('caches a genuine hit only when both client and scope are present', async () => {
                enumerateLeagueSeasons.mockResolvedValue([{ year: 2022, leagueKey: 'nfl.l.222' }]);

                const first = await _resolveSeasonLeagueKey(client, 2022, 'userCache');
                const second = await _resolveSeasonLeagueKey(client, 2022, 'userCache');

                expect(first).toBe('nfl.l.222');
                expect(second).toBe('nfl.l.222');
                // Second call served from cache → enumeration ran only once.
                expect(enumerateLeagueSeasons).toHaveBeenCalledTimes(1);
        });

        it('never caches a null (unresolvable) season key', async () => {
                enumerateLeagueSeasons.mockResolvedValue([{ year: 1999, leagueKey: 'nfl.l.999' }]);

                const first = await _resolveSeasonLeagueKey(client, 2030, 'userNull');
                const second = await _resolveSeasonLeagueKey(client, 2030, 'userNull');

                expect(first).toBeNull();
                expect(second).toBeNull();
                // A null result is never cached, so a later successful resolution isn't masked.
                expect(enumerateLeagueSeasons).toHaveBeenCalledTimes(2);
        });

        it('isolates cache entries per session id', async () => {
                enumerateLeagueSeasons.mockResolvedValue([{ year: 2023, leagueKey: 'nfl.l.333' }]);

                // userA primes the cache for 2023.
                await _resolveSeasonLeagueKey(client, 2023, 'userA');
                expect(enumerateLeagueSeasons).toHaveBeenCalledTimes(1);

                // userB must NOT be served userA's cached entry — its own enumeration runs.
                await _resolveSeasonLeagueKey(client, 2023, 'userB');
                expect(enumerateLeagueSeasons).toHaveBeenCalledTimes(2);

                // userA's repeat is still a cache hit (no extra enumeration).
                await _resolveSeasonLeagueKey(client, 2023, 'userA');
                expect(enumerateLeagueSeasons).toHaveBeenCalledTimes(2);
        });
});

describe('_loadAllTransactions caching boundary', () => {
        it('does NOT cache when no session scope is present (logged-out path)', async () => {
                const first = await _loadAllTransactions(client, 'nfl.l.aaa', null);
                const second = await _loadAllTransactions(client, 'nfl.l.aaa', null);

                expect(first).toEqual([{ type: 'trade' }, { type: 'trade' }, { type: 'trade' }]);
                expect(second).toEqual(first);
                // No scope → no cache, so the league/transactions fetch re-runs every time.
                expect(loadLeagueData).toHaveBeenCalledTimes(2);
        });

        it('caches a non-empty result only when both client and scope are present', async () => {
                const first = await _loadAllTransactions(client, 'nfl.l.bbb', 'userTx');
                const second = await _loadAllTransactions(client, 'nfl.l.bbb', 'userTx');

                expect(first.length).toBe(3);
                expect(second).toEqual(first);
                // Second call served from cache → underlying fetch ran only once.
                expect(loadLeagueData).toHaveBeenCalledTimes(1);
        });

        it('never caches an empty result (possible auth error)', async () => {
                loadLeagueTransactions.mockResolvedValue([]);

                const first = await _loadAllTransactions(client, 'nfl.l.ccc', 'userEmpty');
                const second = await _loadAllTransactions(client, 'nfl.l.ccc', 'userEmpty');

                expect(first).toEqual([]);
                expect(second).toEqual([]);
                // Empty array is never cached → the fetch re-runs on the next call.
                expect(loadLeagueData).toHaveBeenCalledTimes(2);
        });

        it('never caches when loadLeagueData returns null (auth error)', async () => {
                loadLeagueData.mockResolvedValue(null);

                const first = await _loadAllTransactions(client, 'nfl.l.ddd', 'userAuthErr');
                const second = await _loadAllTransactions(client, 'nfl.l.ddd', 'userAuthErr');

                expect(first).toEqual([]);
                expect(second).toEqual([]);
                expect(loadLeagueData).toHaveBeenCalledTimes(2);
        });

        it('isolates cache entries per session id', async () => {
                // userA primes the cache for this league key.
                await _loadAllTransactions(client, 'nfl.l.shared', 'userA');
                expect(loadLeagueData).toHaveBeenCalledTimes(1);

                // userB must NOT be served userA's cached transactions — its own fetch runs.
                await _loadAllTransactions(client, 'nfl.l.shared', 'userB');
                expect(loadLeagueData).toHaveBeenCalledTimes(2);

                // userA's repeat is still a cache hit.
                await _loadAllTransactions(client, 'nfl.l.shared', 'userA');
                expect(loadLeagueData).toHaveBeenCalledTimes(2);
        });
});

// Past-season trades are reconstructed from the archive (player movement only).
// _attachTradedPicks re-hydrates the traded DRAFT PICKS from Yahoo, keyed by the
// league id embedded in the archived transaction id. It must: skip cleanly when
// logged out / no trades present, attach picks only to the matching transaction,
// and never throw when the Yahoo call fails.
describe('_attachTradedPicks', () => {
        it('does nothing (and never calls Yahoo) when there is no yahooClient', async () => {
                const txns = [{ transaction_id: '461.l.744586.tr.1', type: 'trade' }];
                await _attachTradedPicks(txns, null, 'userP');
                expect(getTradedPicks).not.toHaveBeenCalled();
                expect(txns[0].draft_picks).toBeUndefined();
        });

        it('does nothing when there is no trade row to derive a league key from', async () => {
                const txns = [{ transaction_id: '461.l.744586.tr.5', type: 'waiver' }];
                await _attachTradedPicks(txns, client, 'userP');
                expect(getTradedPicks).not.toHaveBeenCalled();
                expect(txns[0].draft_picks).toBeUndefined();
        });

        it('derives the league key from the transaction id and attaches picks to the matching trade only', async () => {
                const picks = [{ season: '2025', round: 2, roster_id: 3, owner_id: 7, previous_owner_id: 3 }];
                getTradedPicks.mockResolvedValue(new Map([['461.l.uniq1.tr.9', picks]]));

                const txns = [
                        { transaction_id: '461.l.uniq1.tr.9', type: 'trade' },
                        { transaction_id: '461.l.uniq1.tr.4', type: 'trade' }
                ];
                await _attachTradedPicks(txns, client, 'userPicks1');

                // League key is the transaction id with the trailing `.tr.N` stripped.
                expect(getTradedPicks).toHaveBeenCalledWith('461.l.uniq1', client);
                expect(txns[0].draft_picks).toEqual(picks);
                expect(txns[1].draft_picks).toBeUndefined();
        });

        it('caches the pick map per viewer so paging/search never refetch it', async () => {
                getTradedPicks.mockResolvedValue(new Map([['461.l.uniq2.tr.1', [{ round: 1 }]]]));

                const make = () => [{ transaction_id: '461.l.uniq2.tr.1', type: 'trade' }];
                await _attachTradedPicks(make(), client, 'userPicks2');
                await _attachTradedPicks(make(), client, 'userPicks2');

                // Second call served from the per-viewer cache → Yahoo hit only once.
                expect(getTradedPicks).toHaveBeenCalledTimes(1);
        });

        it('never throws and leaves the player side intact when the Yahoo call fails', async () => {
                getTradedPicks.mockRejectedValue(new Error('999 Request denied'));

                const txns = [{ transaction_id: '461.l.uniq3.tr.1', type: 'trade' }];
                await expect(_attachTradedPicks(txns, client, 'userPicks3')).resolves.toBeUndefined();
                expect(txns[0].draft_picks).toBeUndefined();
        });
});
