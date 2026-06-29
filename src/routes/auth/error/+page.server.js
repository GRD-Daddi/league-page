import { getAuthConfig } from '$lib/server/authConfig.js';

export function load({ url }) {
        const { redirectUri } = getAuthConfig(url.origin);
        return { redirectUri };
}
