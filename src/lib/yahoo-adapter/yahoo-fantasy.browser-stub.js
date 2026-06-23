/**
 * Browser-only stub for the `yahoo-fantasy` package.
 *
 * `yahoo-fantasy` is a Node-only library (it imports `https`, `crypto`, and
 * `querystring`) and can never run in the browser. The Yahoo data chain is
 * always executed server-side, but the legacy `helper.js` barrel transitively
 * references it from client code. This stub is aliased in for the client bundle
 * only (see `vite.config.js`) so the production build succeeds; it throws if it
 * is ever actually instantiated in the browser.
 */
export default class YahooFantasyBrowserStub {
	constructor() {
		throw new Error('yahoo-fantasy is server-only and cannot be used in the browser');
	}
}
