---
name: final_rank semantics & corrupted-season repair
description: What final_rank means, and how to repair a season whose team_season_archive got botched
---

# final_rank is FINAL (playoff) placement, not regular-season standing

**Rule:** `team_season_archive.final_rank` is the season's *final* finish after
playoffs. The regular-season leader is frequently NOT the champion. All champion/
title/podium displays read `final_rank` (champion = `final_rank=1`), so a wrong
final_rank silently mis-credits titles.

**Why:** A user reported being shown as champion of a year he didn't win. He had the
best regular-season record (12-2) but lost in the playoffs; the real champ won the
bracket with a worse record. The corrupted backfill had stamped ranks in regular-
season-ish order, crediting the wrong owner.

# A single season can be corrupted while game data stays intact

**Symptoms of a botched season backfill (seen for one year):**
- `team_season_archive` rows have bogus sequential `final_rank`, zeroed
  wins/losses/points_for, but real `manager_name`.
- Extra duplicate rows for the same year stored under the NEXT year's league-key
  prefix (e.g. 2025 rows under `470.l.99366...` which is 2026's key), with no
  manager_name — these match `season_archive`'s podium names.
- `season_archive.champion_team_key` points at that wrong-key row, so it won't join
  to a manager.

**Repair (no Yahoo re-fetch needed) — `matchup_archive` holds the real per-game data:**
- Recompute W-L and points_for/against per team from `matchup_archive` self-joined on
  (year,week,matchup_id) with `team_key<>team_key`; use `is_playoffs=false` for the
  W-L record and regular-season point totals.
- Authoritative podium (1/2/3) comes from `season_archive.champion_name/runner_up_name/
  third_name`; set those three final_ranks explicitly, then rank the rest 4..N by
  (wins desc, points_for desc) — an approximation for non-podium placement.
- Delete the duplicate wrong-league-key rows; fix `season_archive.champion_team_key`
  to the real (current-year-key) champion team so it joins to a manager.

**How to apply:** This is a DATA fix (psql), not a code change — every consumer reads
the corrected `final_rank`, so nothing in archiveStats.js needs editing. DB is shared
dev/prod, so the live site reflects it without a republish.
