---
name: Svelte 5 silently tolerates undeclared template vars
description: Why a commissioner reconciliation badge was permanently stuck on "Balanced" / $0 despite correct-looking markup
---

In Svelte 5 runes mode, referencing an **undeclared** identifier in template
markup (or in a `$derived(...)` expression) does NOT fail `vite build` — it
compiles fine and the value is just `undefined`/`NaN` at runtime.

**Symptom seen:** the commissioner Buy-in & Split "Dues Reconciliation" block used
`splitMismatch` (in the badge `{splitMismatch ? 'Out of balance' : 'Balanced'}`)
and `splitTotal` (in `allocated = $derived(round2(paidThisYear * splitTotal))`),
but neither was ever declared. `splitMismatch` → undefined → badge stuck on
"Balanced"; `splitTotal` was actually the *imported function* so `paidThisYear *
splitTotal` → NaN → Allocated rendered `$0`. The build passed, masking it.

**Fix:** declare them as `$derived` from the tested pure helpers in `potSplit.js`
(`computeSplitTotal`, `isSplitMismatch`).

**How to apply:** a clean `vite build` does NOT prove template identifiers are
wired. When a Svelte 5 derived/computed value looks "stuck" or always shows a
default, grep the script block to confirm every template var is actually
declared — don't trust the compiler to catch it.
