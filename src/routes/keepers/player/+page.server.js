import { isCommissioner } from '$lib/server/commissioner.js';
import { getCurrentSeasonYear } from '$lib/server/pot.js';
import { getKeeperState } from '$lib/server/keepers.js';

// Dedicated per-player keeper lineage page. Reuses the SAME engine state as the
// keeper room so the full story can never disagree with the inline view or the
// eligibility verdict. Keyed by ?team= & ?player= so the same player on two
// rosters resolves to the right team.
export async function load({ url, locals }) {
        const { yahooClient, leagueKey } = locals;
        const year = getCurrentSeasonYear();
        const teamKey = (url.searchParams.get('team') || '').trim();
        const playerKey = (url.searchParams.get('player') || '').trim();

        const base = {
                teamKey,
                playerKey,
                upcomingYear: year,
                isLoggedIn: !!locals.session?.userId,
                isCommissioner: isCommissioner(locals.session)
        };

        if (!teamKey || !playerKey) {
                return { lineage: { ...base, status: 'not-found' } };
        }

        const state = await getKeeperState(year, yahooClient, leagueKey, locals.session?.userId || null);

        // Live rosters are required to resolve a player's full lineage; logged-out
        // visitors (no Yahoo client) get a clear prompt rather than an error.
        if (state.requiresAuth) {
                return { lineage: { ...base, status: 'requires-auth' } };
        }

        const team = state.teams.find((t) => t.teamKey === teamKey);
        const player = team?.players.find((p) => p.playerKey === playerKey);
        if (!team || !player) {
                return { lineage: { ...base, status: 'not-found' } };
        }

        return {
                lineage: {
                        ...base,
                        status: 'ok',
                        upcomingYear: state.upcomingYear,
                        teamName: team.teamName,
                        manager: team.manager || null,
                        player
                }
        };
}
