import YahooFantasy from 'yahoo-fantasy';

let yahooClient = null;

export function initializeYahooClient(appKey, appSecret, tokenCallback = null, redirectUri = null) {
        yahooClient = new YahooFantasy(appKey, appSecret, tokenCallback, redirectUri);
        return yahooClient;
}

/**
 * Returns the global Yahoo client singleton.
 * 
 * SECURITY WARNING: This client should ONLY be used for unauthenticated requests
 * (e.g., OAuth flow initialization, token refresh).
 * 
 * NEVER call setUserToken() or setRefreshToken() on this client as it is shared
 * across all requests and would cause token leakage between users.
 * 
 * For authenticated requests, ALWAYS use createAuthenticatedClient() instead.
 */
export function getYahooClient() {
        if (!yahooClient) {
                const appKey = import.meta.env.VITE_YAHOO_APP_KEY || process.env.VITE_YAHOO_APP_KEY;
                const appSecret = import.meta.env.VITE_YAHOO_APP_SECRET || process.env.VITE_YAHOO_APP_SECRET;
                
                if (!appKey || !appSecret) {
                        console.warn('Yahoo API credentials not configured. Set VITE_YAHOO_APP_KEY and VITE_YAHOO_APP_SECRET environment variables.');
                        return null;
                }
                
                yahooClient = new YahooFantasy(appKey, appSecret);
        }
        return yahooClient;
}

/**
 * Creates a new Yahoo client instance with user-specific access and refresh tokens.
 * 
 * SECURITY: This creates an isolated client instance for a specific user's session.
 * Each call returns a NEW instance that is not shared with other users.
 * 
 * This is the ONLY safe way to make authenticated API calls on behalf of users.
 * 
 * @param {string} accessToken - User's OAuth access token
 * @param {string} refreshToken - User's OAuth refresh token
 * @returns {YahooFantasy} A new Yahoo client instance with the user's tokens
 */
export function createAuthenticatedClient(accessToken, refreshToken) {
        const appKey = import.meta.env.VITE_YAHOO_APP_KEY || process.env.VITE_YAHOO_APP_KEY;
        const appSecret = import.meta.env.VITE_YAHOO_APP_SECRET || process.env.VITE_YAHOO_APP_SECRET;
        
        if (!appKey || !appSecret) {
                console.warn('Yahoo API credentials not configured.');
                return null;
        }
        
        // Create a NEW client instance for this user (not the shared singleton)
        const client = new YahooFantasy(appKey, appSecret);
        
        if (accessToken) {
                client.setUserToken(accessToken);
        }
        if (refreshToken) {
                client.setRefreshToken(refreshToken);
        }
        
        return client;
}

export function setYahooUserToken(token) {
        const client = getYahooClient();
        if (client) {
                client.setUserToken(token);
        }
}

export function setYahooRefreshToken(token) {
        const client = getYahooClient();
        if (client) {
                client.setRefreshToken(token);
        }
}
