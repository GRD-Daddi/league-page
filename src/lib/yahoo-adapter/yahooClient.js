import YahooFantasy from 'yahoo-fantasy';

let yahooClient = null;

export function initializeYahooClient(appKey, appSecret, tokenCallback = null, redirectUri = null) {
	yahooClient = new YahooFantasy(appKey, appSecret, tokenCallback, redirectUri);
	return yahooClient;
}

export function getYahooClient() {
	if (!yahooClient) {
		const appKey = import.meta.env.VITE_YAHOO_APP_KEY;
		const appSecret = import.meta.env.VITE_YAHOO_APP_SECRET;
		
		if (!appKey || !appSecret) {
			console.warn('Yahoo API credentials not configured. Set VITE_YAHOO_APP_KEY and VITE_YAHOO_APP_SECRET environment variables.');
			return null;
		}
		
		yahooClient = new YahooFantasy(appKey, appSecret);
	}
	return yahooClient;
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
