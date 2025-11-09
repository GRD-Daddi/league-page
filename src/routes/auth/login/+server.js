import { redirect } from '@sveltejs/kit';
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
        
        // Create a mock Express-style response to capture the redirect URL
        let capturedUrl = null;
        const mockRes = {
                redirect: (url) => {
                        capturedUrl = url;
                }
        };
        
        // Call auth() with mock response object
        yf.auth(mockRes);
        
        if (!capturedUrl) {
                return new Response('Failed to generate OAuth URL', { status: 500 });
        }
        
        // Add state parameter for CSRF protection
        const finalAuthUrl = `${capturedUrl}&state=${state}`;
        
        throw redirect(302, finalAuthUrl);
}
