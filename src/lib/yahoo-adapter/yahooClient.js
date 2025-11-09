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
function getEnvVar(name) {
        if (typeof process !== 'undefined' && process.env) {
                return process.env[name];
        }
        if (typeof import.meta !== 'undefined' && import.meta.env) {
                return import.meta.env[name];
        }
        return undefined;
}

export function getYahooClient() {
        if (!yahooClient) {
                const appKey = getEnvVar('VITE_YAHOO_APP_KEY');
                const appSecret = getEnvVar('VITE_YAHOO_APP_SECRET');
                
                if (!appKey || !appSecret) {
                        console.warn('Yahoo API credentials not configured. Set VITE_YAHOO_APP_KEY and VITE_YAHOO_APP_SECRET environment variables.');
                        console.warn('AppKey:', appKey ? 'found' : 'missing', 'AppSecret:', appSecret ? 'found' : 'missing');
                        return null;
                }
                
                yahooClient = new YahooFantasy(appKey, appSecret);
                console.log('[Yahoo Client] Client initialized successfully');
        }
        return yahooClient;
}

/**
 * Executes a Yahoo API call with automatic retry logic for intermittent Yahoo API failures.
 * Yahoo's API is known to return sporadic "consumer_key_unknown" errors even with valid credentials.
 * This wrapper handles those failures gracefully with exponential backoff.
 * 
 * @param {Function} apiCall - Async function that makes the Yahoo API call
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise} The result of the API call
 */
export async function withRetry(apiCall, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
                try {
                        return await apiCall();
                } catch (error) {
                        const isConsumerKeyError = error?.description?.includes?.('consumer_key_unknown') ||
                                                                         error?.message?.includes?.('consumer_key_unknown') ||
                                                                         error?.lang === 'en-US' && error?.description?.includes?.('valid credentials');
                        
                        const isLastAttempt = attempt === maxRetries - 1;
                        
                        if (isConsumerKeyError && !isLastAttempt) {
                                const delayMs = 1000 * (attempt + 1); // Exponential backoff: 1s, 2s, 3s
                                console.warn(`[Yahoo API Retry] consumer_key_unknown error (attempt ${attempt + 1}/${maxRetries}). Retrying in ${delayMs}ms...`);
                                await new Promise(resolve => setTimeout(resolve, delayMs));
                                continue;
                        }
                        
                        throw error;
                }
        }
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
        const appKey = getEnvVar('VITE_YAHOO_APP_KEY');
        const appSecret = getEnvVar('VITE_YAHOO_APP_SECRET');
        
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
