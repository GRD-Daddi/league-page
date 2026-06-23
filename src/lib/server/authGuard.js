import { redirect } from '@sveltejs/kit';

/**
 * Throws a redirect to the home page if the user is not authenticated.
 *
 * Important: we deliberately redirect to an in-app page (`/`) rather than
 * straight to `/auth/login` (which immediately bounces to Yahoo's external
 * OAuth page). An automatic redirect to Yahoo breaks client-side navigation
 * and, inside an embedded preview/iframe, hangs indefinitely because Yahoo
 * refuses to be framed. Home renders instantly and shows a "Log in with
 * Yahoo" prompt that the user clicks deliberately as a full-page navigation.
 *
 * The original destination is preserved in `?loginRequired=` so the home page
 * can show a contextual message and send the user back after login.
 */
export function requireAuth(locals, url) {
        if (!locals?.session?.userId) {
                const returnTo = url?.pathname || '/';
                throw redirect(302, `/?loginRequired=${encodeURIComponent(returnTo)}`);
        }
}
