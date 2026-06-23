import { building } from '$app/environment';

if (!building && !process.env.SESSION_SECRET) {
	console.error(
		'[Auth] SESSION_SECRET environment variable is not set. ' +
		'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
		'and add it as a Replit Secret.'
	);
}

export function getAuthConfig(origin = '') {
	const appKey = process.env.VITE_YAHOO_APP_KEY;
	const appSecret = process.env.VITE_YAHOO_APP_SECRET;
	const redirectUri =
		process.env.VITE_YAHOO_REDIRECT_URI || `${origin}/auth/yahoo/callback`;

	return { appKey, appSecret, redirectUri };
}
