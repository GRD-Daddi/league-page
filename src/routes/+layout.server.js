import { isCommissioner } from '$lib/server/commissioner.js';
import { getPotTotal } from '$lib/server/pot.js';

export async function load({ locals }) {
	const session = locals.session;

	let potTotal = 0;
	try {
		potTotal = await getPotTotal();
	} catch (err) {
		console.error('[layout] Error loading pot total:', err.message);
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
