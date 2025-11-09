import { getYahooClient } from '$lib/yahoo-adapter/yahooClient.js';

export async function GET({ url, cookies }) {
        const yf = getYahooClient();
        
        if (!yf) {
                return new Response('Yahoo API credentials not configured. Set VITE_YAHOO_APP_KEY and VITE_YAHOO_APP_SECRET environment variables.', {
                        status: 500
                });
        }
        
        const state = crypto.randomUUID();
        
        cookies.set('oauth_state', state, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 10 * 60
        });
        
        const authUrl = yf.auth();
        
        const finalAuthUrl = `${authUrl}&state=${state}`;
        
        return new Response(null, {
                status: 302,
                headers: {
                        'Location': finalAuthUrl
                }
        });
}
