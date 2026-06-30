---
name: Shared matchup card + unified render path (live + archived)
description: Live and archived /matchups now render through ONE path (week-tabs + gameCard snippet → MatchupBar). Archived label=owner+team two lines; live=team name one line.
---

# Shared matchup card + unified render path

Live (current season) and archived (past season) `/matchups` BOTH render through the
**same** path in `src/routes/matchups/+page.svelte`: the year/week tabs + the
`gameCard` snippet → `src/lib/Matchups/MatchupBar.svelte` (name line(s) + avatar +
big points + VS + "VIEW LINEUPS ▼").

**Winner highlight (one signal, lime):** there is NO two-color tug-of-war. Only the
WINNER's side gets a single lime (`--sn-lime`, #ccff00 — the SAME accent as the pot
pill and active year chip) fill anchored to that side, width = winner's score share
(hp/total or ap/total, always ≥50%), with a bright leading edge (border + inset glow)
marking where the points land. Winner's avatar/points go lime, name white; loser dims.
Tie / null winner (live 0-0) → no fill, both neutral.
**Why:** close matchups were unreadable when both sides glowed cyan vs lime — the user
asked for one obvious winner cue, using the app's single lime accent (not a new gold).
Don't reintroduce per-side cyan/lime win colors or a separate gold token.

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
