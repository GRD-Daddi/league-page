---
name: Matchup archive must cover playoff weeks
description: Why the durable matchup archive uses a full-schedule loader, not the regular-season matchup loader.
---

The durable matchup archive (`matchup_archive`) must capture EVERY week's score, including playoffs.

**Why:** `loadMatchupData()` deliberately loops only `1 .. playoff_week_start - 1` (regular season), because the live matchups page handles playoffs separately via `loadBrackets`. Feeding the archive from `loadMatchupData` silently drops all playoff weeks, leaving history incomplete.

**How to apply:** For any code that snapshots a whole season's matchups (backfill, end-of-season capture), use `loadAllSeasonMatchups()` in dataLoaders.js — it loops `1 .. end_week` (default 18), is resilient per-week (a failing/out-of-range week is skipped, never aborts), and returns `playoffsStart` so `captureSeason` can mark `is_playoffs` (week >= playoffsStart). The live matchups page can stay on `loadMatchupData` for incremental regular-season capture, since backfill (which includes the current league key) fills in playoff weeks.
