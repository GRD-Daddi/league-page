---
name: Player dataset field shape
description: The player map served to all pages uses Sleeper-style abbreviated keys, even on the Yahoo platform
---

The player objects in `playersInfo.players` (from `/api/fetch_players_info`, via `loadPlayers`) are keyed by player id and use **abbreviated Sleeper-style fields**: `fn` (first name), `ln` (last name), `pos` (position), `t` (team).

**Why:** That endpoint sources player/projection data from Sleeper's projections API (`api.sleeper.app/projections/...`) and reshapes it to `{fn, ln, pos, t}` — NOT from the Yahoo player adapter. The Yahoo `playerAdapter.js` emits `full_name/first_name/position/team`, but its output is NOT what reaches the page-level player map. Mixing the two shapes caused the manager page to render raw player ids with missing pos/team.

**How to apply:** When rendering players in any `+page.svelte`, read `p.fn/p.ln/p.pos/p.t`. Build name as `` `${p.fn ?? ''} ${p.ln ?? ''}`.trim() ``. The rosters/drafts pages already do this correctly — copy their pattern. Keep `full_name/position/team` only as a defensive fallback.
