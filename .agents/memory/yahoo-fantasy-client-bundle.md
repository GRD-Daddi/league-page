---
name: yahoo-fantasy client-bundle leak
description: Why vite build fails on yahoo-fantasy and how it's kept out of the browser bundle
---

# yahoo-fantasy leaks into the client bundle

`yahoo-fantasy` is Node-only (imports `https`, `crypto`, `querystring`). The legacy
`src/lib/utils/helper.js` barrel re-exports the whole Yahoo data chain
(`helperFunctions/* → platformApi.js → $lib/yahoo-adapter → yahoo-fantasy`), and
nearly every `.svelte` component imports client-safe names (e.g. `leagueName`,
`round`) from that same barrel. That transitively pulls `yahoo-fantasy` into the
**client** bundle, so `npm run build` fails with
`"stringify" is not exported by "__vite-browser-external"`. The SSR bundle builds fine.

**Why a dynamic `import()` behind `!browser` is NOT enough on its own:** Vite/Rollup
*transforms* the imported module at resolve time (before tree-shaking), so it still
hits the Node `querystring` import while building the browser bundle.

**The fix that works:** a Vite plugin (`vite.config.js`,
`stubYahooFantasyInBrowser`, `enforce: 'pre'`) whose `resolveId` swaps
`yahoo-fantasy` for `src/lib/yahoo-adapter/yahoo-fantasy.browser-stub.js` only when
`options.ssr` is falsy. SSR keeps the real module. The stub throws if ever
instantiated in the browser.

**How to apply:** If you add another Node-only dependency that ends up reachable from
client code via the helper barrel, either stub it the same way or break the client
import chain. Don't rely on `if (!browser)` DCE alone to keep a Node lib out of the
client bundle.
