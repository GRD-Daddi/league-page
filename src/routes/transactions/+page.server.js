import { loadLeagueData, loadLeagueUsers, loadLeagueTransactions, loadPlayers } from '$lib/server/dataLoaders.js';
import { getArchiveYears } from '$lib/server/archiveStats.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { enumerateLeagueSeasons } from '$lib/server/historyBackfill.js';
import { leagueName } from '$lib/utils/leagueInfo.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';

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

        // The live season uses the configured league key; a past season is resolved
        // to its own Yahoo league key via the multi-season enumeration helper (the
        // same raw, token-only history recovery used elsewhere). Both are then loaded
        // the same way — week 1 through playoffs — so past trades/waivers render with
        // the full transaction display rather than the keeper-decomposed archive.
        const seasonLeagueKey = isLive
                ? leagueKey
                : await resolveSeasonLeagueKey(yahooClient, selectedYear);

        const [transactions, leagueTeamManagersData, playersData] = await waitForAll(
                seasonLeagueKey ? loadAllTransactions(yahooClient, seasonLeagueKey) : Promise.resolve([]),
                seasonLeagueKey ? loadLeagueUsersAsMap(yahooClient, seasonLeagueKey) : Promise.resolve({}),
                loadPlayers(fetch),
        );

        const props = {
                years: yearOptions,
                selectedYear,
                isLive,
                show: 'both',
                query: '',
                playersData,
                transactions,
                leagueTeamManagersData,
                page: 0,
        };

        if (show && (show === 'trade' || show === 'waiver' || show === 'both')) props.show = show;
        if (query && query !== 'undefined') props.query = query;
        if (curPage && !isNaN(curPage)) props.page = parseInt(curPage) - 1;

        return props;
}

// Resolves the Yahoo league key for a past season by name+year. Returns null when
// it can't be determined (e.g. logged-out, or the season predates the account),
// which the loader surfaces as the friendly empty state rather than an error.
async function resolveSeasonLeagueKey(yahooClient, year) {
        if (!yahooClient) return null;
        try {
                const seasons = await enumerateLeagueSeasons(yahooClient, leagueName);
                const match = seasons.find((s) => s.year === year);
                return match?.leagueKey ?? null;
        } catch (err) {
                console.error('[transactions] season league key lookup failed:', err.message);
                return null;
        }
}

async function loadAllTransactions(yahooClient, leagueKey) {
        const leagueData = await loadLeagueData(yahooClient, leagueKey);
        if (!leagueData) return [];

        const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
        const transactionPromises = [];
        for (let i = 1; i <= regularSeasonLength + 2; i++) {
                transactionPromises.push(loadLeagueTransactions(yahooClient, leagueKey, i));
        }

        const transactionWeeks = await waitForAll(...transactionPromises);
        return transactionWeeks.flat();
}

async function loadLeagueUsersAsMap(yahooClient, leagueKey) {
        const users = await loadLeagueUsers(yahooClient, leagueKey);
        return toMap(users);
}

function toMap(rawUsers) {
        const out = {};
        for (const user of rawUsers || []) out[user.user_id] = user;
        return out;
}
