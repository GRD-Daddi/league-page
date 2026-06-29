---
name: Svelte 5 form fields must init $state from server data, not $effect alone
description: Editable inputs populated only via $effect show their bare defaults during SSR / when hydration breaks, looking like saved data is "all 0 / not saving".
---

# Svelte 5 form fields: initialise $state from server data

## Rule
For commissioner-style editable forms, initialise the bound `$state` variables
DIRECTLY from `data.<...>` at declaration (e.g.
`let firstAmt = $state(data.commissioner.season.payoutFirst)`), not from a bare
default that a `$effect` later overwrites. Keep the `$effect` only for re-syncing
after `invalidateAll` / form actions.

## Why
`$effect` does NOT run during SSR, and won't run at all if client hydration is
broken (e.g. a stale Vite dep cache — see vite-stale-dep-cache-after-merge.md). A
field whose value comes only from `$effect` therefore renders its `$state(0)`/`''`
default server-side. Read-only siblings that print server data straight in the
markup (e.g. `c.payoutPool.first.amount`) still show the real value, so you get the
tell-tale split: **the ledger shows $900/$300 but the input boxes show 0**, and a
native form POST still saves correctly yet the redisplayed 0 makes it look like
"payouts won't save". The data was never the problem; the form's first paint was.

## How to apply
When a user reports "fields show 0 / blank and won't save" but the DB is correct:
1. Confirm the DB actually holds the values (it usually does).
2. Check whether the inputs are populated by a client-only `$effect` — if so, move
   the initial value into the `$state(...)` initializer from `data.*`.
3. Use optional chaining for nullable server fields (e.g.
   `data.commissioner.champion?.reigning?.name`).
Both this symptom and a dead nav flyout in the same session were the SAME broken
hydration root cause — suspect hydration first when multiple interactive things
break at once.
