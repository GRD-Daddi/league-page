import { isCommissioner } from '$lib/server/commissioner.js';
import { computePotData } from '$lib/server/pot.js';

export async function load({ locals }) {
	const session = locals.session;

	// The nav pot pill is league financial data, shown only to authenticated
	// users. It uses the SAME figure the homepage headline shows — the projected
	// carryover total while buy-ins are still being collected, otherwise the
	// actual balance — so the pill never drifts from the rest of the site.
	let potTotal = 0;
	if (session) {
		try {
			const potData = await computePotData();
			const proj = potData?.projection ?? null;
			const isEstimate = !!proj && !proj.fullyCollected && proj.expectedMembers > 0;
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
