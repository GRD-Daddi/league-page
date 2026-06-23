import { sveltekit } from '@sveltejs/kit/vite';
import { fileURLToPath } from 'node:url';

const yahooFantasyBrowserStub = fileURLToPath(
	new URL('./src/lib/yahoo-adapter/yahoo-fantasy.browser-stub.js', import.meta.url)
);

/**
 * `yahoo-fantasy` is a Node-only library (imports `https`, `crypto`,
 * `querystring`). It is only ever used server-side, but the legacy `helper.js`
 * barrel transitively references the Yahoo chain from client code, which pulls
 * it into the browser bundle and breaks `vite build`. This plugin swaps it for
 * a harmless stub when resolving for the browser, while leaving the real module
 * intact for SSR (`options.ssr === true`).
 */
function stubYahooFantasyInBrowser() {
	return {
		name: 'stub-yahoo-fantasy-in-browser',
		enforce: 'pre',
		resolveId(id, importer, options) {
			if (id === 'yahoo-fantasy' && !options?.ssr) {
				return yahooFantasyBrowserStub;
			}
			return null;
		}
	};
}

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [stubYahooFantasyInBrowser(), sveltekit()],
	server: {
		host: '0.0.0.0',
		port: 5000,
		strictPort: false,
		allowedHosts: true,
		hmr: {
			clientPort: 5000
		}
	},
	preview: {
		host: '0.0.0.0',
		port: 5000,
		strictPort: false
	}
};

export default config;
