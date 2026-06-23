import { redirect } from '@sveltejs/kit';
import { getAuthConfig } from '$lib/server/authConfig.js';

export async function GET({ url, cookies }) {
        const { appKey, redirectUri } = getAuthConfig(url.origin);

        if (!appKey) {
                throw redirect(302, '/auth/error?reason=credentials_missing');
        }

        const returnTo = url.searchParams.get('returnTo') || '/';
        cookies.set('auth_return_to', returnTo, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 10 * 60
        });

        const state = crypto.randomUUID();
        cookies.set('oauth_state', state, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 10 * 60
        });

        const authUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth');
        authUrl.searchParams.set('client_id', appKey);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);

        console.log('[OAuth] login: redirecting to Yahoo request_auth at', new Date().toISOString());

        throw redirect(302, authUrl.toString());
}
