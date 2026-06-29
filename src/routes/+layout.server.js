import { isCommissioner } from '$lib/server/commissioner.js';
import { computePotData } from '$lib/server/pot.js';
import { loadLeagueData, loadNFLState } from '$lib/server/dataLoaders.js';
import { resolveSeasonPhase, isDraftPrepPhase } from '$lib/utils/seasonPhase.js';

export async function load({ locals }) {
        const session = locals.session;

        // The nav pot pill is league financial data, shown only to authenticated
        // users. It uses the SAME figure the homepage headline shows — the projected
        // carryover total while buy-ins are still being collected, otherwise the
        // actual balance — so the pill never drifts from the rest of the site.
        // Projection is a PRE-SEASON forecast only: once the season is live
        // (regular/playoffs) the pill shows the actual collected balance.
        let potTotal = 0;
        if (session) {
                try {
                        const [potData, nflState, leagueData] = await Promise.all([
                                computePotData(),
                                loadNFLState(locals.yahooClient).catch(() => null),
                                locals.leagueKey
                                        ? loadLeagueData(locals.yahooClient, locals.leagueKey).catch(() => null)
                                        : Promise.resolve(null)
                        ]);
                        const draftPrep = isDraftPrepPhase(resolveSeasonPhase(nflState, leagueData));
                        const proj = potData?.projection ?? null;
                        const isEstimate =
                                draftPrep && !!proj && !proj.fullyCollected && proj.expectedMembers > 0;
                        potTotal = isEstimate ? proj.potTotalProjected : potData?.potTotal ?? 0;
                } catch (err) {
                        console.error('[layout] Error loading pot total:', err.message);
                }
        }

        return {
                potTotal,
                session: session
                        ? {
                                        authenticated: true,
                                        managerInfo: session.managerInfo ?? null,
                                        isCommissioner: isCommissioner(session)
                                }
                        : { authenticated: false, isCommissioner: false }
        };
}
