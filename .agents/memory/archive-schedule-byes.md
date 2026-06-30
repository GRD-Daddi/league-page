---
name: Archived matchup schedule byes (one-sided games)
description: getArchivedSchedule can emit games with a null home or away side; any matchup UI must render sides conditionally.
---

`getArchivedSchedule(year)` in `src/lib/server/archiveStats.js` builds each game as
`{ home: a ?? null, away: b ?? null, winner, bracket }`. When a week has an odd
number of teams / a bye, only one side exists — the other is `null`.

**Rule:** Any component rendering an archived game must guard each side
(`{#if g.home}` / `{#if g.away}`) and only show the VS divider when BOTH exist.

**Why:** A refactor of the past-season `/matchups` head-to-head bar rendered both
sides unconditionally, fabricating a phantom "Unknown / —" opponent for byes.
Caught in code review, not visible in dev because byes are rare.

**How to apply:** Same applies anywhere the archive schedule shape is consumed
(matchups page, any future standings/bracket view fed by getArchivedSchedule).
