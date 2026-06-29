---
name: Homepage auth gating & pot-value sync
description: Homepage is the only public route; league data must be auth-gated, and the carryover-pot figure shown anywhere must use the projected-vs-actual headline rule, not the raw actual total.
---

# Homepage auth gating & pot-value sync

## League data is auth-gated on the homepage
The homepage (`/`) is the only public landing route. Logged-out visitors must see
ONLY the hero + a login prompt — never league data (carryover pot, payout pool,
"person to beat", trophy room, standings, nav pot pill).

**How to apply:** Gate at BOTH layers — the loader returns nulls + `requiresAuth:true`
for unauthenticated requests (so data never leaves the server), and the template
gates each band on `!data?.requiresAuth`. The nav pot pill lives in the shared
layout, so it's gated separately: `+layout.server.js` only computes the figure when
`session` exists, and `Nav/index.svelte` wraps the pill in `{#if session?.authenticated}`.

**Why:** Otherwise league financials leak to anyone, and "data shows when not authd"
bugs recur because the nav is shared and easy to forget.

## The pot figure has TWO values — always show the headline one
`computePotData()` exposes `potTotal` (actual collected balance) AND
`projection.potTotalProjected` (what it becomes once all expected buy-ins are paid).
The site headline shows the PROJECTED value while buy-ins are still being collected,
else the actual: `poolIsEstimate ? projection.potTotalProjected : potTotal`, where
`poolIsEstimate = !!projection && !projection.fullyCollected && projection.expectedMembers > 0`.

**Why:** A separate helper that returns only the actual total (e.g. the old
`getPotTotal()`) drifts from the homepage headline — the classic symptom is the nav
pill showing a smaller number ($2,400) than the homepage carryover ($3,000).

**How to apply:** Anywhere you surface "the pot" (nav pill, etc.) reuse
`computePotData()` and the same projected-vs-actual rule. Don't reintroduce an
actual-only shortcut. `potTotal`/`projection` are year-based DB values and do NOT
depend on the Yahoo client, so the layout can call `computePotData()` without one.

## Homepage trophy/podium source
The homepage Trophy Room "last season top 3" must read the canonical archive
(`getSeasonPodiums()[0]` from `archiveStats.js`, sourced from `season_archive`
champion/runner_up/third), NOT a live-Yahoo derivation. See champion-auto-record.md
and archive-final-rank-vs-corruption.md for why live Yahoo / `final_rank` paths drift.
