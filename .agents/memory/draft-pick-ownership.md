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
