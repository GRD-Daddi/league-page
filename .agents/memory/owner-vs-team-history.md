---
name: Owner-grouped league history
description: All league-history stats are grouped by OWNER (manager nickname), not team_name; how owner identity is resolved and displayed.
---

League-history pages (records, standings archive, managers, manager detail, rivalry) group stats by the **owner/person**, not by team_name. A manager's team name changes most years, so team_name is only a per-year sub-detail.

**Owner identity key:** `team_season_archive.manager_name` (and `roster_archive.manager_name`) hold the Yahoo manager nickname, backfilled keyed by exact `team_key`. This is the join/group key across seasons.

**Display name:** `ownerDisplayName(nickname)` in `src/lib/utils/ownerNames.js` (shared server+client) — capitalizes the nickname; OVERRIDES map handles special nicknames (e.g. `'*'` → `'Mystery'`); null/empty → `'Unknown'`. Always wrap a raw nickname with this before rendering, including live (current-year) rows, or capitalization/override behavior drifts.

**Records attribution across renamed teams:** matchup-based records join `matchup_archive` → `team_season_archive` on `year + team_key` to recover the owner (team_name alone is unreliable). Season-based records read `manager_name` directly.

**Why:** before this, e.g. one owner's 3 titles were split across 3 different team names and looked like 3 different champions. Grouping by owner makes career/championship/H2H stats correct.

**How to apply:** all-time metrics filter to completed seasons via `year IN (SELECT year FROM season_archive WHERE status='complete')` (excludes the live/pre_draft current year). Server fns return both `owner` (raw key) and `ownerName` (display); use `owner` for routing/lookups (`/manager?owner=`, head-to-head), `ownerName` for display.
