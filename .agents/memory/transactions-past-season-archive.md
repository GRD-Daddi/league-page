---
name: Past-season /transactions served from archive
description: Why past-season trades/waivers come from transaction_archive (not live Yahoo) and why some player names show "Unknown"
---

# Past-season /transactions: archive-backed, names best-effort

For a PAST season, `/transactions` reconstructs transactions from the durable
`transaction_archive` table, NOT a live Yahoo fetch. Only the LIVE/current season
hits Yahoo.

**Why:** the old live path fired ~17 Yahoo calls per page view (enumerate seasons
+ one transaction fetch per week). Under load Yahoo answers `999 Request denied`,
the season-key lookup returns null, and the page falls back to the empty state
("Nobody has made any trades yet"). The archive is immutable for closed seasons,
so re-fetching every view bought nothing but fragility.

**How to apply:** the loader branches on `isLive`. Past → `loadArchivedTransactions(year)`
(DB), with a fallback to the live path only if a year has no archived rows.
`loadArchivedTransactions` regroups the per-player archive rows by `transaction_id`
into the SAME adapter shape the Yahoo adapter produces (`adds`/`drops` keyed by
player_key→roster_id, `type`, `created`), then feeds the existing
`digestTransactions`. A `trade` row writes the same player to BOTH adds(to) and
drops(from) — that's exactly how `digestOne/handleAdds` detects a trade move.

## Player names are the weak spot
`transaction_archive` stores only Yahoo ids (`player_id`/`player_key`), NO
`player_name` (the column exists but is empty for all rows). Names are resolved at
render time from two Yahoo-free sources:
1. Sleeper `yahoo_id` bridge (in `digestOne`) — covers OLDER seasons ~100% but
   recent seasons only ~70% (Sleeper hasn't tagged recent churn players).
2. `roster_archive` name dict (`buildArchiveNameDict`, fed in as `players_meta`) —
   but `roster_archive` only holds the CURRENT seasons (e.g. 2025/2026), so it
   mainly rescues rostered players + league defenses.

Result: older years ~0% Unknown, most-recent year ~25–32% Unknown (deep-waiver
churn players that are in neither source).

## Names FIX applied (no-auth, durable)
`transaction_archive.player_name` was empty for all rows; it is now backfilled
**out-of-band from the public DynastyProcess crosswalk** (db_playerids.csv has
`yahoo_id`→`name`, ~5.5k entries) plus the roster-archive name dict. `loadArchivedTransactions`
now SELECTs `player_name` and feeds it into `players_meta` with priority:
roster-archive dict (name+pos+team) > backfilled `player_name` (name only) >
generic **"Defense"** for Yahoo DEF-id range (numeric id `>= 99000`) > Unknown.
Effective render Unknown rate dropped to ~0% (2018–2023), 0.5% (2024), 7.6% (2025).
**Why a public crosswalk and not Yahoo:** all skill-position players resolve with
zero auth and it's verifiable from the agent env (Yahoo OAuth can't complete in
the Replit preview iframe).

## Yahoo NFL DEF id map is the weak spot
Team-defense player ids (suffix after `.p.`, e.g. `100007`) are **stable across
seasons** (only the game prefix changes), but there is **no reliable no-auth source
for the full 32-team suffix→team map**: roster_archive only yields the ~16 teams
that were ever in a captured snapshot; Sleeper DEF entries carry **no** yahoo_id;
DynastyProcess has no DEF yahoo_id; and **web search HALLUCINATES the map** (a
plausible alphabetical table that fails ground-truth anchors — it claimed 8=Bengals
but roster_archive proves 8=Lions, 12=Packers vs Chiefs, and stopped at 32 though
Texans=34). Confirmed anchors: 7=Broncos,8=Lions,12=Chiefs,15=Dolphins,16=Vikings,
17=Patriots,18=Saints,19=Giants,21=Eagles,23=Steelers,24=Chargers,25=49ers,
26=Seahawks,27=Buccaneers,30=Jaguars,34=Texans. The remaining ~16 suffixes render
as generic "Defense". **The only way to complete the DEF map + the residual churn
players is a one-time authenticated Yahoo backfill** (logged-in user's session).

## Traded draft picks (also Yahoo-only)
The archive stored player movement only — it never persisted traded DRAFT PICKS.
`getTradedPicksByTransaction(leagueKey, yf)` (now exported from the Yahoo adapter)
is reused by `_attachTradedPicks` in the transactions loader: for a past season it
derives the league key from any archived `transaction_id` (strip trailing
`.tr.N` → `<game>.l.<id>`), fetches traded picks ONCE (cached per viewer under
`txPicks:<leagueKey>:<scope>`), and attaches `draft_picks` to matching trade rows.
Best-effort (try/catch): a 999/logged-out failure leaves the player side intact.
One cached call/season is acceptable vs the ~17/view burst that caused the
original 999 failures.
