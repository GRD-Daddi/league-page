import { loadLeagueData, loadDraftResults, loadLeagueUsers, loadPlayers } from '$lib/server/dataLoaders.js';
import { requireAuth } from '$lib/server/authGuard.js';
import { waitForAll } from '$lib/utils/helperFunctions/multiPromise';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { getDraftPickOwnership, DRAFT_ROUNDS } from '$lib/server/draftPicks.js';
import { getApprovedKeepers } from '$lib/server/keepers.js';

export async function load({ url, fetch, locals }) {
        requireAuth(locals, url);

        const { yahooClient, leagueKey } = locals;

        const [upcomingDraftData, previousDraftsData, leagueTeamManagersData, playersData] = await waitForAll(
                loadDraftResults(yahooClient, leagueKey),
                loadPreviousDrafts(yahooClient, leagueKey),
                loadLeagueUsersAsMap(yahooClient, leagueKey),
                loadPlayers(fetch),
        );

        const draftPickYear = getCurrentSeasonYear();
        let draftPickOwnership = { rounds: DRAFT_ROUNDS, teams: [] };
        try {
                draftPickOwnership = await getDraftPickOwnership(draftPickYear);
        } catch (err) {
                console.error('[drafts] Error loading draft pick ownership:', err.message);
        }

        let approvedKeepers = [];
        try {
                approvedKeepers = await getApprovedKeepers(draftPickYear);
        } catch (err) {
                console.error('[drafts] Error loading approved keepers:', err.message);
        }

        return {
                upcomingDraftData,
                previousDraftsData,
                leagueTeamManagersData,
                playersData,
                draftPickOwnership,
                draftPickYear,
                approvedKeepers
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
