---
name: Playoff bracket derivation (championship vs consolation)
description: How to split archived playoff games into brackets without stored bracket metadata
---

matchup_archive stores only `is_playoffs` (no bracket type). To split playoff games into
Championship vs Consolation brackets, run **union-find over playoff matchups**: teams only
ever play opponents within their own bracket, so each connected component of the playoff-game
graph IS a bracket.

**How to apply:** label the component containing the best (lowest) `final_rank`
(from team_season_archive) as 'championship'; all other components are 'consolation'.
Fallback when final_rank is absent: largest component = championship.

**Why:** there is no seed-cutoff or bracket-size field, and num_teams/2 is NOT the cutoff
(2020 had 10 teams but a 6-team championship bracket). The graph-component approach needs no
external cutoff and was verified correct against 2018/2020/2021/2023/2025 (every championship
component contained final_rank 1). Lives in archiveStats.js getArchivedSchedule →
assignPlayoffBrackets; consumed by /matchups archived (past-season) view only (live view uses
the separate MatchupsAndBrackets library component).
