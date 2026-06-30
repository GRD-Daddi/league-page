---
name: Matchup drill-in player scores
description: How per-player matchup scores are sourced for archived vs live seasons
---

The durable archive (matchup_archive) stores ONLY team totals (week, matchup_id,
roster_id, team_key, team_name, points, final_rank) — NO player rows. So the
/matchups "drill into a game → full lineups + per-player scores" expander fetches
player-level data ON DEMAND from Yahoo's scoreboard.

**How to apply:**
- Endpoint: `/api/matchup-detail?year&week&matchup`.
- Resolve the season's league key: for a PAST year, derive it from the archived
  `team_key` by stripping `.t.<n>` (e.g. `461.l.744586.t.1` → `461.l.744586`);
  for the live current year use `locals.leagueKey`.
- Call `getYahooLeagueMatchups(leagueKey, week, yahooClient)` and match sides by
  `roster_id` (NOT matchup_id — the adapter re-sequences matchup_id per fetch).
- Bridge player ids via the existing yahoo→sleeper rule (numeric after `.p.` ==
  `player.yh` in the loadPlayers map). DEF often won't bridge → fall back to name.

**Why:** backfilling player rows for every historical week is heavy and Yahoo
keeps history queryable by the old league key, so on-demand fetch keeps the
archive small while still giving full lineups.
