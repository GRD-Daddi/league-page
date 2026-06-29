---
name: Draft-picks-by-round UI is the square-cell grid (both /keepers and home)
description: The canonical "Draft picks by round" visual is the .picks-grid/.pick-cell square grid; do not replace it with pill chips.
---

# Draft-picks-by-round UI: square-cell grid is canonical

The owner-facing "Draft picks by round" section on BOTH the home page
(`src/routes/+page.svelte`) and `/keepers` (`src/routes/keepers/+page.svelte`)
must render as the `.picks-grid` / `.pick-cell` square-cell grid: each round is a
small cell with `R{n}` stacked over a plain numeric count, and empty rounds dimmed
via `.pick-cell.empty`.

**Why:** the user explicitly prefers this square-cell grid. A prior task replicated
the UI in the WRONG direction — it changed /keepers FROM the square grid TO the home
page's compact pill-chip style. The user wanted the opposite: keep the square grid on
/keepers AND bring it to the home page. Both pages now share the square grid.

**How to apply:** if asked to "match" the two draft-picks UIs, converge on the
square-cell grid, never the pill chips. Keepers reads counts from `team.picks?.[i]`;
home reads via `picksForRound(team, rnd)` over `DRAFT_ROUNDS` — different data shapes,
same visual. The square grid intentionally has no per-cell over-limit highlight; the
over-limit signal lives in the separate `roundConflicts` warning banner on /keepers.
