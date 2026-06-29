import { fail } from '@sveltejs/kit';
import { isCommissioner } from '$lib/server/commissioner.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { getKeeperState, saveKeeperSelection, removeKeeperSelection } from '$lib/server/keepers.js';
import { captureKeeperData } from '$lib/server/keeperArchive.js';
import { getArchivedRosters } from '$lib/server/archive.js';

// The Keepers page is PUBLIC: anyone can view the keeper room read-only. Only
// the select/unselect actions require a logged-in manager (enforced per-action).
export async function load({ locals }) {
        const { yahooClient, leagueKey } = locals;
        const year = getCurrentSeasonYear();

        // Fire-and-forget snapshot of the current league's draft + transactions so
        // the engine stays fresh without a manual backfill. Best-effort: failures
        // are logged inside captureKeeperData and never block the page. Skipped for
        // logged-out visitors who have no Yahoo client.
        if (yahooClient && leagueKey) {
                captureKeeperData(yahooClient, leagueKey).catch(() => {});
        }

        const state = await getKeeperState(year, yahooClient, leagueKey);
        const myTeamKey = locals.session?.managerInfo?.metadata?.team_key || null;

        // Logged-out visitors have no Yahoo client, so live rosters can't load.
        // Still expose a genuine read-only view of the keepers already locked in,
        // grouped by team (team names recovered from archived rosters).
        let publicTeams = null;
        if (state.requiresAuth) {
                publicTeams = await buildPublicView(state.selections, state.upcomingYear);
        }

        return {
                keepers: {
                        ...state,
                        myTeamKey,
                        isLoggedIn: !!locals.session?.userId,
                        isCommissioner: isCommissioner(locals.session),
                        publicTeams
                }
        };
}

async function buildPublicView(selections, upcomingYear) {
        const nameByTeam = new Map();
        for (const y of [upcomingYear, upcomingYear - 1, upcomingYear - 2]) {
                const rows = await getArchivedRosters(y).catch(() => []);
                for (const r of rows) {
                        if (r.team_key && !nameByTeam.has(r.team_key)) nameByTeam.set(r.team_key, r.team_name);
                }
                if (nameByTeam.size) break;
        }
        const byTeam = new Map();
        for (const s of selections || []) {
                if (!byTeam.has(s.team_key)) {
                        byTeam.set(s.team_key, {
                                teamKey: s.team_key,
                                teamName: nameByTeam.get(s.team_key) || 'Team',
                                players: []
                        });
                }
                byTeam.get(s.team_key).players.push(s);
        }
        return [...byTeam.values()].sort((a, b) => a.teamName.localeCompare(b.teamName));
}

function authForTeam(locals, teamKey) {
        if (!locals?.session?.userId) return fail(401, { error: 'Not authenticated' });
        const myTeamKey = locals.session?.managerInfo?.metadata?.team_key;
        if (!isCommissioner(locals.session) && teamKey !== myTeamKey) {
                return fail(403, { error: 'You can only set keepers for your own team.' });
        }
        return null;
}

export const actions = {
        select: async ({ request, locals }) => {
                const form = await request.formData();
                const teamKey = (form.get('teamKey') || '').toString().trim();
                const playerKey = (form.get('playerKey') || '').toString().trim();

                const denied = authForTeam(locals, teamKey);
                if (denied) return denied;

                const res = await saveKeeperSelection({
                        year: getCurrentSeasonYear(),
                        teamKey,
                        playerKey,
                        submittedBy: locals.session.userId,
                        yahooClient: locals.yahooClient,
                        leagueKey: locals.leagueKey
                });
                if (!res.ok) return fail(400, { error: res.error });
                return { success: true, action: 'select' };
        },

        unselect: async ({ request, locals }) => {
                const form = await request.formData();
                const teamKey = (form.get('teamKey') || '').toString().trim();
                const playerKey = (form.get('playerKey') || '').toString().trim();

                const denied = authForTeam(locals, teamKey);
                if (denied) return denied;

                await removeKeeperSelection(getCurrentSeasonYear(), teamKey, playerKey);
                return { success: true, action: 'unselect' };
        }
};
