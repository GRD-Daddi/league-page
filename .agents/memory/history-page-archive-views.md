---
name: Per-season history page archive views
description: Convention for rendering past seasons on standings/matchups and deep-linking from records
---

# Past-season views render from the archive, not Yahoo

**Rule:** History pages take a `?year=` param. When the selected year is the current
live season, render the live Yahoo path; for any past season, serve from the durable
archive tables and skip all Yahoo calls entirely. Standings was the first to do this;
matchups now mirrors it (year tabs + an archive branch). New per-season history views
should follow the same shape.

**Why:** Past Yahoo leagues can be deleted/unavailable and offseason Yahoo endpoints
return zeroed garbage, so history must come from the archive. Skipping Yahoo for past
years also avoids slow/failing live calls when only browsing history.

**How to apply:**
- Server load: `getArchiveYears()` for the tab list, `getCurrentSeasonYear()` for the
  live boundary, `isLive = selectedYear === currentYear`. Past year → archive helper,
  return `{ isLive:false, ... }` and skip Yahoo.
- Matchups archive schedule = `getArchivedSchedule(year)` in archiveStats.js: groups
  matchup_archive by week→matchup, resolves each side's owner via team_season_archive
  join, winner = rosterId of higher score (or 'tie').
- Default year differs intentionally: standings defaults to most-recent archived year;
  matchups defaults to current (live) year since the live season is its primary view.
- Records cards deep-link by record type: game records (have week+matchupId) →
  `/matchups?year=&week=&matchup=`; season records → `/standings?year=&team=`. The
  target pages highlight/scroll to the matching matchup card / team row.
- Rosters now follows this too, with two extra constraints: (1) roster snapshotting
  started recently, so only offer year tabs for `currentYear` (live) + years from
  `getRosterArchiveYears()` (= seasons with players>0); older seasons exist in
  season_archive but have empty roster_archive and must NOT be selectable. (2) Some
  backfilled seasons (e.g. 2025) have ZEROED team_season_archive W/L but valid
  final_rank — suppress a synthetic "0-0" record and show "Finished #N" instead.
