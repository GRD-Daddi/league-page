import YahooFantasy from 'yahoo-fantasy';

let yahooClient = null;

function getEnvVar(name) {
	if (typeof process !== 'undefined' && process.env) {
		return process.env[name];
	}
	if (typeof import.meta !== 'undefined' && import.meta.env) {
		return import.meta.env[name];
	}
	return undefined;
}

export function initializeYahooClient(appKey, appSecret, tokenCallback = null, redirectUri = null) {
	if (!yahooClient) {
		yahooClient = new YahooFantasy(appKey, appSecret, tokenCallback, redirectUri);
	}
	return yahooClient;
}

/**
 * Returns the global Yahoo client singleton.
 * SECURITY WARNING: Never call setUserToken() on this — it's shared across all requests.
 * For authenticated requests, always use createAuthenticatedClient() instead.
 */
export function getYahooClient() {
	if (!yahooClient) {
		const appKey = getEnvVar('VITE_YAHOO_APP_KEY');
		const appSecret = getEnvVar('VITE_YAHOO_APP_SECRET');
		const redirectUri = getEnvVar('VITE_YAHOO_REDIRECT_URI') || 'http://localhost:5000/auth/yahoo/callback';

		if (!appKey || !appSecret) {
			console.warn('[Yahoo Client] Credentials not configured (VITE_YAHOO_APP_KEY / VITE_YAHOO_APP_SECRET)');
			return null;
		}

		yahooClient = new YahooFantasy(appKey, appSecret, null, redirectUri);
	}
	return yahooClient;
}

/**
 * Executes a Yahoo API call with automatic retry logic for intermittent Yahoo API failures.
 */
export async function withRetry(apiCall, maxRetries = 3) {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await apiCall();
		} catch (error) {
			const isConsumerKeyError = error?.description?.includes?.('consumer_key_unknown') ||
				error?.message?.includes?.('consumer_key_unknown');

			const isLastAttempt = attempt === maxRetries - 1;

			if (isConsumerKeyError && !isLastAttempt) {
				const delayMs = 1000 * (attempt + 1);
				console.warn(`[Yahoo API] consumer_key_unknown (attempt ${attempt + 1}/${maxRetries}), retrying in ${delayMs}ms...`);
				await new Promise(resolve => setTimeout(resolve, delayMs));
				continue;
			}

			throw error;
		}
	}
}

/**
 * Creates a new Yahoo client instance with user-specific access and refresh tokens.
 * SECURITY: Each call returns a NEW instance — never shared between users.
 */
export function createAuthenticatedClient(accessToken, refreshToken) {
	const appKey = getEnvVar('VITE_YAHOO_APP_KEY');
	const appSecret = getEnvVar('VITE_YAHOO_APP_SECRET');

	if (!appKey || !appSecret) {
		console.warn('[Yahoo Client] Credentials not configured.');
		return null;
	}

	const client = new YahooFantasy(appKey, appSecret);

	if (accessToken) client.setUserToken(accessToken);
	if (refreshToken) client.setRefreshToken(refreshToken);

	return client;
}

export function setYahooUserToken(token) {
	const client = getYahooClient();
	if (client) client.setUserToken(token);
}

export function setYahooRefreshToken(token) {
	const client = getYahooClient();
	if (client) client.setRefreshToken(token);
}
