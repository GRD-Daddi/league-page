import YahooFantasy from 'yahoo-fantasy';

let yahooClient = null;

export function initializeYahooClient(appKey, appSecret, tokenCallback = null, redirectUri = null) {
        yahooClient = new YahooFantasy(appKey, appSecret, tokenCallback, redirectUri);
        return yahooClient;
}

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

export function createAuthenticatedClient(accessToken, refreshToken) {
        const appKey = import.meta.env.VITE_YAHOO_APP_KEY || process.env.VITE_YAHOO_APP_KEY;
        const appSecret = import.meta.env.VITE_YAHOO_APP_SECRET || process.env.VITE_YAHOO_APP_SECRET;
        
        if (!appKey || !appSecret) {
                console.warn('Yahoo API credentials not configured.');
                return null;
        }
        
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
