---
name: Draft pick ownership model
description: Why the upcoming-draft "Draft Picks by Team" board uses manual counts-per-round, not Yahoo data
---
The Drafts page "Draft Picks by Team" board is driven by commissioner-entered data
(`draft_pick_ownership` table; editor on the commissioner page), NOT by Yahoo's API.

**Rule:** model is counts-per-round per team per year (1 = standard pick, 0 = traded
away, 2+ = acquired). Saves are authoritative per year (transaction deletes the
year's rows then re-inserts). Public board reads `getCurrentSeasonYear()`.

**Why:** Yahoo's predicted/predraft draft board is unreliable before the draft
happens, so it showed bad data. The league wanted a clean, manually-maintained
breakdown for the upcoming draft only.

**How to apply:** Do not "fix" this by wiring in Yahoo predicted picks. If extending
to past seasons, key by year (already supported). Each round column should total the
team count (12) — the editor footer flags mismatches.

## Editor grid seeding footgun (Svelte 5)
The commissioner editor seeds its editable `draftGrid` ($state) from server data
(`c.draftPicks`/prefill) inside a `$effect`. The commissioner page has many other
forms, all using `use:enhance`, which run `invalidateAll()` on success.

**Rule:** seed-from-props effects must re-seed ONLY when the source genuinely
changes — guard with a plain (non-`$state`) `lastSeedKey` that stringifies the
source identity, and the key MUST include `c.year` (season switch) plus the saved
teams/picks/rounds/member keys.

**Why:** without the guard, any unrelated `invalidateAll()` (e.g. marking a buy-in
paid) re-ran the effect and reset `draftGrid` back to saved/prefill, silently wiping
the commissioner's in-progress pick edits before they hit Save — so prefill values
got persisted and the public board never reflected real edits. Omitting `c.year`
from the key lets a year switch between two same-shaped (e.g. both prefill) seasons
skip re-seeding.

**How to apply:** keep `lastSeedKey` a plain `let` (not `$state`) so reading/writing
it inside the effect creates no reactive dependency/loop. This pattern applies to any
"hydrate editable state from props" effect on a page with multiple enhanced forms.
