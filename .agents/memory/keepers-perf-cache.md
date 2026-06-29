---
name: Keepers page slowness & per-viewer Yahoo cache
description: Why Keep/Remove felt frozen, and the opt-in per-viewer cache that fixed it without leaking roster data.
---

# Keeper page "clicking does nothing / so slow"

Every Keep/Remove on `/keepers` is a form POST with default `use:enhance`, which
calls `invalidateAll()` on success and re-runs the page `load()`. That `load()`
→ `getKeeperState()` re-fetches ALL live Yahoo data on every click:
`loadLeagueRostersWithFallback` (walks up to 12 seasons of the renew chain) +
`loadLeagueUsers`. None of it was cached → seconds of latency per click, and the
button had no pending state so it looked frozen.

## Fix (two parts)
1. **Per-viewer opt-in cache** in `dataLoaders.js` (60s TTL Map). The two slow
   loaders take a 3rd `cacheScope` arg; caching happens ONLY when both a
   `yahooClient` AND a `cacheScope` are present, and `cacheScope` is part of the
   key. `getKeeperState(year, client, leagueKey, viewerKey)` threads it; the
   keepers page passes `session.userId`.
2. **Immediate feedback**: custom `use:enhance` callback sets a per-player
   `submitting` flag (try/finally to always clear), button shows "Saving…" +
   disabled.

**Why per-viewer, not league-global:** a league-key-only cache is a cross-user
access-control risk — one member warming the cache could serve full roster/user
data to a different (or non-member) logged-in viewer for up to 60s, bypassing
Yahoo's per-request auth. Scoping the key by `session.userId` means a viewer can
only ever read their OWN warmed entry; their own Yahoo request still decides what
they can see. Logged-out callers (no client) and pages that pass no scope are
never cached, so the public read-only keeper view is unchanged.

**Why it's safe re staleness:** keeper SELECTIONS always come fresh from Postgres
(`getKeeperSelections`) every load, so a just-made Keep/Remove is never stale even
while the Yahoo roster/user layer is cached.

**How to apply:** if another hot path re-runs an expensive Yahoo loader on
invalidateAll, give the loader a `cacheScope` and pass `session.userId`. Never
cache Yahoo league data keyed by league alone.
