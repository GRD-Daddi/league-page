import { redirect } from '@sveltejs/kit';

export async function GET({ url, cookies }) {
        const appKey = process.env.VITE_YAHOO_APP_KEY || import.meta.env.VITE_YAHOO_APP_KEY;
        const redirectUri = process.env.VITE_YAHOO_REDIRECT_URI || 
                                                import.meta.env.VITE_YAHOO_REDIRECT_URI || 
                                                `${url.origin}/auth/callback`;
        
        if (!appKey) {
                return new Response('Yahoo API credentials not configured. Set VITE_YAHOO_APP_KEY environment variable.', {
                        status: 500
                });
        }
        
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
        
        throw redirect(302, authUrl.toString());
}
