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
churn players that are in neither source). **Full names require a one-time
authenticated Yahoo name backfill into `transaction_archive.player_name`** — which
needs the logged-in user's working Yahoo session (can't be run from the agent env;
Yahoo OAuth can't complete in the Replit preview iframe). That backfill is the
correct last-mile fix if 100% names are needed.
