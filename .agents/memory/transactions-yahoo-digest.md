---
name: Transactions page Yahoo digest contract
description: What the legacy /transactions display components require, and why past-season team names must come from the durable archive, not live Yahoo owner fetches.
---

# Transactions display: legacy components need digested data

The `/transactions` UI uses the LEGACY Sleeper-era components
(`TradeTransaction`, `WaiverTransaction`, `TransactionMove`, via `TransactionsPage`).
They were NOT rewritten for Yahoo. They require three things the raw Yahoo
adapters do NOT provide on their own:

1. **Digested transactions** — `{ id, date, season, type:'trade'|'waiver', rosters, moves }`.
   The Yahoo adapter returns RAW Sleeper-shape (`roster_ids`, `adds`/`drops`
   keyed by Yahoo player key, `draft_picks`, `players_meta`). Digestion runs
   server-side in `src/lib/server/transactionDigest.js` (`digestTransactions`).

2. **`{ currentSeason, teamManagersMap:{ [year]:{ [rosterId]:{team:{name,avatar},managers} } }, users }`**
   passed as `leagueTeamManagersData` — NOT a flat `{user_id:user}` map.
   `getTeamFromTeamManagers(ltm, roster, season)` indexes
   `teamManagersMap[season][roster].team`; a flat map throws.

3. **`players[move.player]` keyed by a SLEEPER player id** (drives `fn/ln/pos/t`
   AND the `sleepercdn.com/.../thumb/{id}.jpg` avatar). Bridge Yahoo player key
   `nfl.p.NNNN` → Sleeper id via the players map's `yh` field (numeric after
   `.p.`). Fall back to a synthetic entry from the name/pos/team Yahoo embeds in
   `players_meta` when no Sleeper match.

**Why it matters:** the page only renders the friendly empty state without
crashing when there are NO transactions; ANY non-empty raw transaction crashes
the legacy components. So "no transactions → empty state" can look fine while
past seasons with real trades are broken.

## Past-season team names come from the ARCHIVE, not live Yahoo

`buildTransactionTeamManagers(year, extraRosters)` in `transactionDigest.js`
reads per-season team names from the durable `team_season_archive` DB table
(same source the rest of the history pages use). It scopes both the season and
"current owner" lookups to that one season, so NO misleading cross-season
"(current owner)" label appears — a deliberate product choice.

**Why archive, not live Yahoo owner fetch:** a parallel attempt built the
team-manager map by fetching the past season's owner list live from Yahoo
(`loadLeagueUsers` on the resolved past league key) and bridging owners by GUID.
That was dropped during rebase because past-season Yahoo fetches via library
helpers are flaky in the offseason (see `yahoo-history-archive` /
`yahoo-adapter-quirks`): they can return empty, which silently degrades every
old-season team to a `Team N` placeholder — exactly the bug the page is meant to
fix. The archive is the reliable source for past-season names.

**How to apply:** for any past-season history surface, read team identity from
the archive (`team_season_archive`, `matchup_archive`, etc.), not from a live
Yahoo fetch on an old league key. Reserve live Yahoo calls for the current
season's configured league key.
