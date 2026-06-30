---
name: Shared matchup card + unified render path (live + archived)
description: Live and archived /matchups now render through ONE path (week-tabs + gameCard snippet → MatchupBar). Archived label=owner+team two lines; live=team name one line.
---

# Shared matchup card + unified render path

Live (current season) and archived (past season) `/matchups` BOTH render through the
**same** path in `src/routes/matchups/+page.svelte`: the year/week tabs + the
`gameCard` snippet → `src/lib/Matchups/MatchupBar.svelte` (proportional cyan/lime
"tug-of-war" score fill, name line(s) + avatar + big points + VS + "VIEW LINEUPS ▼").

**Why:** the user explicitly required live and past matchup cards to look identical.
Previously live used a *different* render path (`MatchupsAndBrackets → MatchupWeeks →
Matchup.svelte`), which produced a different layout. That legacy live path was removed.

**How it's unified:** `+page.server.js` `buildLiveSchedule(matchupsData,
teamManagersData)` maps the live Yahoo `matchupWeeks` into the SAME `schedule` shape
that `getArchivedSchedule` (archiveStats.js) returns — `{week, isPlayoffs, games:[{
matchupId, home, away, winner, bracket}]}`. So one template renders both. Live team
`points` is an ARRAY → sum it; `matchupId = pair[0].matchup_id` (matches
captureSeason/matchup_archive so live "VIEW LINEUPS" /api/matchup-detail works);
winner = rosterId, or 'tie' ONLY if points>0, else null (no tie/winner glow on live
0-0 offseason games).

**Label rule (data-driven, NOT a styling difference):**
- Archived side → **two lines**: owner name (line 1, `ownerName ?? teamName`) + team
  name (line 2 sub). `barSide` returns `{name, sub, avatar, points}`.
- Live side → **one line**: team name only (`ownerName` is null for live), because
  Yahoo masks live owner/manager GUIDs as `--hidden--` (see yahoo-hidden-guids.md).
  Do NOT try to surface owner names on live cards.

**Deleted (do NOT reintroduce):** `MatchupsAndBrackets.svelte`, `MatchupWeeks.svelte`,
`Brackets.svelte`, `BracketsColumn.svelte`. `Matchup.svelte` is KEPT — still used by
`src/lib/Rivalry/index.svelte`.

**Week default:** the week-select reactive resets `selectedWeek` whenever
`selectedYear` changes (tracked via `lastYear`), then defaults live → `data.week`
(current week) and archived → first week. Without the reset, switching from an
archived week to the live year kept the old week if it existed in both.

**Known gap:** live playoff weeks are not fetched (`loadMatchupData` only pulls weeks
before `playoff_week_start`), so `isPlayoffs` is never true for live — current-season
playoff brackets don't render. Acceptable while offseason; revisit if live playoffs
must show the champ/consol split.
