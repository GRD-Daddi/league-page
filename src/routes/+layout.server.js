export async function load({ locals }) {
	const session = locals.session;
	return {
		session: session
			? { authenticated: true, managerInfo: session.managerInfo ?? null }
			: { authenticated: false }
	};
}
