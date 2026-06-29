import { loadLeagueData, loadDraftResults, loadLeagueUsers, loadPlayers, loadNFLState } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { getDraftPickOwnership, DRAFT_ROUNDS } from '$lib/server/draftPicks.js';
import { getApprovedKeepers } from '$lib/server/keepers.js';
import { getLatestCompletedStandings } from '$lib/server/archive.js';
import { buildDraftOrder } from '$lib/server/draftOrder.js';
import { resolveSeasonPhase, isDraftPrepPhase } from '$lib/utils/seasonPhase.js';

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;

        const [upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData, nflState, leagueData] = await waitForAll(
                loadDraftResults(yahooClient, leagueKey),
                loadPreviousDrafts(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey),
                loadPlayers(fetch),
                loadNFLState(yahooClient),
                loadLeagueData(yahooClient, leagueKey),
        );

        // The season phase only chooses which tab is shown by DEFAULT — Planning
        // during pre-/off-season, Past Drafts once the draft has happened. Both
        // views' data is loaded unconditionally below so the owner can manually
        // toggle to either view at any point in the season.
        const seasonPhase = resolveSeasonPhase(nflState, leagueData);
        const isDraftPrep = isDraftPrepPhase(seasonPhase);

        const draftPickYear = getCurrentSeasonYear();
        let draftPickOwnership = { rounds: DRAFT_ROUNDS, teams: [] };
        let approvedKeepers = [];
        let draftOrder = [];
        let draftOrderSeason = null;

        try {
                draftPickOwnership = await getDraftPickOwnership(draftPickYear);
        } catch (err) {
                console.error('[drafts] Error loading draft pick ownership:', err.message);
        }

        try {
                approvedKeepers = await getApprovedKeepers(draftPickYear);
        } catch (err) {
                console.error('[drafts] Error loading approved keepers:', err.message);
        }

        // Draft order = REVERSE of last completed season's FINAL standings (worst
        // finisher picks first, champion picks last). getLatestCompletedStandings
        // returns rows already ordered worst-first (final_rank DESC); buildDraftOrder
        // numbers them 1..N and bridges each to the current league's owner/team.
        // Degrades to an empty list (no completed season yet) without erroring.
        try {
                const completed = await getLatestCompletedStandings(draftPickYear);
                draftOrderSeason = completed.year;
                draftOrder = buildDraftOrder(completed.teams, Object.values(leagueTeamManagersData || {}));
        } catch (err) {
                console.error('[drafts] Error deriving draft order:', err.message);
        }

        return {
                upcomingDraftData,
                previousDraftsData,
                leagueTeamManagersData,
                playersData,
                draftPickOwnership,
                draftPickYear,
                approvedKeepers,
                draftOrder,
                draftOrderSeason,
                seasonPhase,
                isDraftPrep
        };
}

async function loadPreviousDrafts(yahooClient, startLeagueKey) {
        let currentKey = startLeagueKey;
        const drafts = [];

        while (currentKey) {
                const leagueData = await loadLeagueData(yahooClient, currentKey);
                if (!leagueData) break;

                const draftResults = await loadDraftResults(yahooClient, currentKey);
                if (draftResults?.length > 0) {
                        drafts.push({ year: parseInt(leagueData.season), draft: draftResults });
                }

                currentKey = leagueData.previous_league_id || null;
        }

        return drafts;
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
