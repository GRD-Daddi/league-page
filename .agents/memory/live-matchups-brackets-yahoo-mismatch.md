---
name: Live matchups view crashes on Yahoo bracket shape
description: Why selecting the current/live year on /matchups white-screened, and the legacy Sleeper bracket debt behind it
---

The live (current-year) /matchups view renders the legacy `MatchupsAndBrackets.svelte`,
which was written for SLEEPER's bracket shape and dereferences `brackets.champs.bracket[0][0][0].points`.
But `loadBrackets()` (Yahoo) returns `{winnersData, losersData, playoffMatchups, numRosters, year,
playoffType, playoffsStart}` (or a requiresAuth variant) — **no `champs` key**. So that expression
threw a TypeError on every hydration, white-screening the current-year tab ("can't select current year").

**Fix applied:** made the guard null-safe (`brackets?.champs?.bracket?.[0]?.[0]?.[0]?.points`).
That stops the crash; the legacy Sleeper playoff `Brackets` block then never renders (it can't with
Yahoo data anyway).

**Why it matters / how to apply:** the live playoff bracket UI is effectively DEAD under Yahoo data —
the entire `MatchupsAndBrackets`→`Brackets` path still expects Sleeper-shaped `champs`/`losers`. The
nice championship/consolation split only exists on the ARCHIVED path (getArchivedSchedule + matchups
+page.svelte). If a real live playoff bracket is ever needed, adapt Brackets.svelte to the Yahoo
winnersData/losersData shape rather than feeding it loadBrackets output directly.
