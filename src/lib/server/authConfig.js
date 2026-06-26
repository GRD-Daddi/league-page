import { building } from '$app/environment';

if (!building && !process.env.SESSION_SECRET) {
        console.error(
                '[Auth] SESSION_SECRET environment variable is not set. ' +
                'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))" ' +
                'and add it as a Replit Secret.'
        );
}

// Resolves the public origin for THIS environment. Replit sets REPLIT_DOMAINS
// per-environment (dev container -> dev domain, deployment -> production domain),
// so it always matches the domain the user is actually browsing. We prefer it
// over a static VITE_YAHOO_REDIRECT_URI override, because a single pinned URL
// (e.g. the dev domain) sends production logins back to the wrong domain — the
// oauth_state cookie is set on prod but the callback lands on dev, which fails
// state verification (invalid_state).
function resolvePublicOrigin(requestOrigin = '') {
        const domains = process.env.REPLIT_DOMAINS;
        if (domains) {
                const first = domains.split(',')[0].trim();
                if (first) return `https://${first}`;
        }
        if (requestOrigin) return requestOrigin;
        if (process.env.VITE_YAHOO_REDIRECT_URI) {
                return process.env.VITE_YAHOO_REDIRECT_URI.replace(/\/auth\/yahoo\/callback\/?$/, '');
        }
        return 'http://localhost:5000';
}

export function getAuthConfig(origin = '') {
        const appKey = process.env.VITE_YAHOO_APP_KEY;
        const appSecret = process.env.VITE_YAHOO_APP_SECRET;
        const redirectUri = `${resolvePublicOrigin(origin)}/auth/yahoo/callback`;

        return { appKey, appSecret, redirectUri };
}
