import { redirect } from '@sveltejs/kit';

/**
 * Throws a redirect to the login page if the user is not authenticated,
 * preserving the current URL so they're sent back after logging in.
 */
export function requireAuth(locals, url) {
	if (!locals?.session?.user_id) {
		const returnTo = url?.pathname || '/';
		throw redirect(302, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
	}
}
