---
name: Yahoo league history archive
description: How to recover real multi-season Yahoo Fantasy history for the league archive
---

# Recovering Yahoo league history (offseason-safe)

**Rule:** To backfill past seasons, enumerate the league's seasons by NAME from the
logged-in user's NFL games, then pull each season's standings + scoreboard from raw
Yahoo REST endpoints. Do NOT rely on `previous_league_id` renew chains, and do NOT
use the offseason library helpers for historical stats.

**Why:**
- Yahoo's `previous_league_id` is NULL for every season of this league — the renew
  chain is broken, so you cannot walk season-to-season. The only stable cross-season
  key is the league NAME ("Minnesota Slopes").
- Offseason, the old capture path (`captureSeason` via `team.meta()` + the library's
  count-keyed scoreboard parsing) returned team NAMES with ALL stats zeroed
  (wins/points_for/points_against=0, final_rank=team order, bogus champions). The raw
  REST endpoints return real data even in the offseason.

**How to apply:**
- Use `src/lib/server/historyBackfill.js` (raw `rawYahooGet`, bypasses the library):
  - `enumerateLeagueSeasons(client, leagueName)` → `/users;use_login=1/games;game_codes=nfl/leagues`, filter by name.
  - `fetchStandings(key)` → `/league/{key}/standings` (real rank/seed/W-L/PF/PA).
  - `fetchScoreboardWeek(key, week)` → `/league/{key}/scoreboard;week=N` (real team_points.total).
  - `fetchSeasonArchiveData` bundles meta+standings+matchup sides.
- Champions: derive from a FINISHED season's true `final_rank === 1`. Skip champion/
  podium for in-progress/predraft seasons (their ranks aren't final).
- Real season→leagueKey chain (game-code prefix changes yearly): 2018=380.l.239445,
  2019=390.l.168608, 2020=399.l.129385, 2021=406.l.761375, 2022=414.l.725091,
  2023=423.l.638428, 2024=449.l.203799, 2025=461.l.744586, 2026=470.l.99366.
  Config `leagueID="nfl.l.99366"` auto-resolves to the current season (470.l.99366).

# Triggering a backfill from the shell

- The commissioner backfill form action is auth-gated (commissioner session + CSRF).
- `$REPLIT_DEV_DOMAIN` refuses plain shell curl (HTTP 000) — the iframe proxy needs
  mTLS. Use `http://localhost:5000/...` from the shell instead; that works.
- Before a full re-backfill, wipe ONLY the pure-archive tables (season_archive,
  team_season_archive, matchup_archive, roster_archive) to clear stale zero/garbage
  rows. NEVER truncate `season_records` (holds pot/payout + manual champions).
