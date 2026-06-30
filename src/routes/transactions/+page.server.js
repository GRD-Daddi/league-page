import { loadLeagueData, loadLeagueTransactions, loadPlayers, getCachedLeagueData, setCachedLeagueData } from '$lib/server/dataLoaders.js';
import { digestTransactions, buildTransactionTeamManagers, loadArchivedTransactions } from '$lib/server/transactionDigest.js';
import { getArchiveYears } from '$lib/server/archiveStats.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { enumerateLeagueSeasons } from '$lib/server/historyBackfill.js';
import { leagueName } from '$lib/utils/leagueInfo.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

// The live season changes throughout the week (new trades/waivers), so its
// cached transaction list gets a deliberately short, predictable TTL: long
// enough that filter/search/paging feels instant, short enough that a freshly
// posted move surfaces promptly. Past seasons are closed/immutable and keep the
// default (longer) shared TTL.
const LIVE_TX_CACHE_TTL_MS = 30_000;

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;
        const show = url?.searchParams?.get('show');
        const query = url?.searchParams?.get('query');
        const curPage = url?.searchParams?.get('page');

        const years = await getArchiveYears();
        const currentYear = getCurrentSeasonYear();
        const requested = parseInt(url.searchParams.get('year'), 10);
        const selectedYear = Number.isFinite(requested) ? requested : currentYear;
        const isLive = selectedYear === currentYear;
        const yearOptions = years.map((y) => ({ year: y.year, status: y.status }));

        // Filter/search/paging on /transactions navigate and re-run this loader, so
        // every interaction within a past season would otherwise re-run the slow
        // multi-season Yahoo enumeration plus a full week-by-week transaction fetch.
        // Mirror the keepers cache: short-lived, OPT-IN, scoped to THIS viewer's
        // session id so one member's payload is never served to another (or to a
        // logged-out visitor). Unresolvable/logged-out results are never cached.
        const cacheScope = locals.session?.userId || null;

        // The live season changes throughout the week, so it's fetched fresh from
        // Yahoo (week 1 through playoffs) using the configured league key. A PAST
        // season is closed/immutable and has already been backfilled into the durable
        // `transaction_archive`, so it's reconstructed straight from the database. This
        // avoids the slow, rate-limit-prone live path for past seasons (a multi-season
        // enumeration plus ~16 weekly Yahoo calls per page view, which Yahoo answers
        // with "999 Request denied" under load — leaving every past season empty).
        // If a past season has no archived rows, fall back to the live Yahoo fetch.
        const [rawTransactions, playersData] = await waitForAll(
                isLive
                        ? (leagueKey ? _loadAllTransactions(yahooClient, leagueKey, cacheScope, LIVE_TX_CACHE_TTL_MS) : Promise.resolve([]))
                        : _loadPastSeasonTransactions(yahooClient, selectedYear, cacheScope),
                loadPlayers(fetch),
        );

        // The Yahoo adapter returns raw, undigested transactions keyed by Yahoo
        // player_key with roster ids only. Digest them into the {id, date, season,
        // type, rosters, moves} shape the UI renders, bridging player ids to the
        // Sleeper-keyed player map (names/avatars) and injecting synthetic entries
        // for players Yahoo ships a name for but Sleeper doesn't map.
        const { transactions, playersPatch } = digestTransactions(rawTransactions, playersData, selectedYear);

        // Every roster a transaction touches must exist in the team-manager map, or
        // getTeamFromTeamManagers throws mid-render. Build it from the durable season
        // archive and backfill any roster the archive is missing.
        const referencedRosters = [...new Set(transactions.flatMap((t) => t.rosters))];
        const leagueTeamManagersData = await buildTransactionTeamManagers(selectedYear, referencedRosters);

        // Merge the synthetic player entries so every move renders; force stale=false
        // so the client never refetches the player map (which would drop the patch).
        const mergedPlayersData = playersData
                ? { ...playersData, players: { ...(playersData.players || {}), ...playersPatch }, stale: false }
                : playersData;

        const props = {
                years: yearOptions,
                selectedYear,
                isLive,
                show: 'both',
                query: '',
                playersData: mergedPlayersData,
                transactions,
                leagueTeamManagersData,
                page: 0,
        };

        if (show && (show === 'trade' || show === 'waiver' || show === 'both')) props.show = show;
        if (query && query !== 'undefined') props.query = query;
        if (curPage && !isNaN(curPage)) props.page = parseInt(curPage) - 1;

        return props;
}

// Past seasons are served from the durable transaction_archive (no live Yahoo
// calls, so no rate-limit "999" failures and instant filter/search/paging). If a
// year somehow has no archived rows (e.g. a season older than the backfill), fall
// back to the original live path so nothing is silently lost.
export async function _loadPastSeasonTransactions(yahooClient, year, cacheScope = null) {
        const archived = await loadArchivedTransactions(year);
        if (archived.length) return archived;

        const seasonLeagueKey = await _resolveSeasonLeagueKey(yahooClient, year, cacheScope);
        if (!seasonLeagueKey) return [];
        return _loadAllTransactions(yahooClient, seasonLeagueKey, cacheScope);
}

// Resolves the Yahoo league key for a past season by name+year. Returns null when
// it can't be determined (e.g. logged-out, or the season predates the account),
// which the loader surfaces as the friendly empty state rather than an error.
// The resolved key is cached per-viewer for a short window so repeated interactions
// (filter/search/paging) within the same season skip the multi-season enumeration.
export async function _resolveSeasonLeagueKey(yahooClient, year, cacheScope = null) {
        if (!yahooClient) return null;
        const canCache = !!cacheScope;
        const cacheKey = `txSeasonKey:${year}:${cacheScope}`;
        if (canCache) {
                const cached = getCachedLeagueData(cacheKey);
                if (cached !== undefined) return cached;
        }
        try {
                const seasons = await enumerateLeagueSeasons(yahooClient, leagueName);
                const match = seasons.find((s) => s.year === year);
                const resolved = match?.leagueKey ?? null;
                // Only cache a genuine hit; a null (unresolvable / logged-out) result is
                // never cached so it can't mask a later successful resolution.
                if (canCache && resolved) setCachedLeagueData(cacheKey, resolved);
                return resolved;
        } catch (err) {
                console.error('[transactions] season league key lookup failed:', err.message);
                return null;
        }
}

export async function _loadAllTransactions(yahooClient, leagueKey, cacheScope = null, ttlMs = undefined) {
        const canCache = !!(yahooClient && cacheScope);
        const cacheKey = `txList:${leagueKey}:${cacheScope}`;
        if (canCache) {
                const cached = getCachedLeagueData(cacheKey);
                if (cached !== undefined) return cached;
        }

        const leagueData = await loadLeagueData(yahooClient, leagueKey);
        if (!leagueData) return [];

        const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
        const transactionPromises = [];
        for (let i = 1; i <= regularSeasonLength + 2; i++) {
                transactionPromises.push(loadLeagueTransactions(yahooClient, leagueKey, i));
        }

        const transactionWeeks = await waitForAll(...transactionPromises);
        const transactions = transactionWeeks.flat();
        // Cache only a non-empty result for a scoped viewer; an empty array can mean
        // an auth error (loadLeagueData returned null) and must not be cached.
        // The live season passes a short TTL so new moves surface promptly; past
        // seasons omit it and fall back to the default (longer) shared TTL.
        if (canCache && transactions.length) setCachedLeagueData(cacheKey, transactions, ttlMs);
        return transactions;
}
