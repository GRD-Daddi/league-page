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

# The repair is NOT durable — it gets wiped and recurs

**Observed:** After repairing 2025 (Ivan/lamar st.brown = champ), the season reverted
to the exact original corrupt state (same dup `470.l.99366` rows, zeroed stats, bogus
ranks crediting matthew=1) across later turns. Identical restoration => regenerated, not
random drift.

**Cause:** The commissioner "Backfill all past seasons" action (POST `?/nArchive`,
requires Yahoo login) re-writes the archive and re-introduces the corrupt 2025 rows.
A DB checkpoint rollback can also revert it. Backfill does NOT run on startup/unauth
page load, so plain dev-server restarts are safe.

**Implication:** A psql-only repair is a band-aid. Permanent fix requires fixing the
backfill writer so 2025 imports with correct final_rank/stats and no next-year-key
duplicate rows. Until then, re-running the backfill silently re-corrupts the season.

**Ground-truth check for the 2025 champion (from real game scores in matchup_archive,
key `461.l.744586`):** wk17 final t.6 lamar st.brown 158.94 beat t.4 Knuck 135 =>
1=Ivan(t.6), 2=Jamieson(t.4); 3rd-place game t.1 BBL Daddi beat t.10 => 3=matthew(t.1).

# UPDATE — root cause found & guarded (supersedes the "backfill" guess above)

The recurring 3-junk-row re-corruption was NOT the commissioner backfill (that
writes each season under its REAL historical league key, correctly). It was
`getLastSeasonPodium` (runs on every authenticated homepage load): it derives last
season's podium from the CURRENT league's rosters (current-league team keys, no
manager_name) and called `snapshotPodium` unconditionally — re-stamping the finalized
prior season with wrong-league-key rows and, via `COALESCE(EXCLUDED, existing)`,
flipping `season_archive.champion_team_key` back to the current-league key.

**Now fixed with two guards (durable rule):** a finalized season (`season_archive.status
= 'complete'`) must never be re-written from current-league-derived data.
(1) `getLastSeasonPodium` skips `snapshotPodium` when the year is already complete.
(2) `snapshotPodium` itself returns early when the year is complete AND the stored
league_key differs from the incoming meta.leagueKey (mirrors `captureSeason`).
**Why it matters:** any new code that snapshots a past season from live rosters will
silently corrupt finalized standings unless it respects this complete-season invariant.
