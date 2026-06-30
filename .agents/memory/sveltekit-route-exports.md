---
name: SvelteKit route module exports
description: Why extra named exports from +page.server.js break the build but not tests
---
SvelteKit validates `+page.server.js` / `+page.js` exports at build time. Only a
fixed set is allowed: `load, prerender, csr, ssr, trailingSlash, config, actions,
entries`, or anything with a `_` prefix. Any other named export throws
`Invalid export '<name>'` during `vite build` (the postbuild analyse step) — but
`vitest run` does NOT catch it, so a green test run can still ship a broken build.

**Why:** the /transactions loader needs testable helpers (resolveSeasonLeagueKey,
loadAllTransactions, attachTradedPicks, loadPastSeasonTransactions). Exporting
them with plain names passed tests but failed `npm run build`.

**How to apply:** to export a helper from a route module for tests, prefix it with
`_` (e.g. `_loadAllTransactions`) — SvelteKit allows `_`-prefixed exports, and the
/transactions route uses exactly this convention. The test then imports the
`_`-prefixed names from `./+page.server.js`. (Extracting helpers to a sibling
plain `.js` also works but is not what this codebase does.) Always run
`npm run build`, not just `npm test`, before declaring a route-touching change
verified.
