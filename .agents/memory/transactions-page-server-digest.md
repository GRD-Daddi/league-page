---
name: Transactions page requires server-side digest
description: Why /transactions showed nothing for every season, and the contract the page actually needs.
---

The `/transactions` (Trades & Waivers) page renders DIGESTED transactions
(`{id, date, season, type, rosters, moves}`) where each move's `player` is a key
into the **Sleeper-keyed** player map. The Yahoo adapter (`loadAllTransactions`)
returns the RAW, undigested sleeper-shaped payload (adds/drops keyed by Yahoo
`player_key`, roster ids only) — the same shape the keeper engine eats.

**Bug:** the loader returned the raw adapter shape straight to the components and
passed a flat user map instead of a `teamManagersMap`, so the page rendered
nothing for any season (live or archived). The digest logic historically lived
only in a browser-coupled client helper, so SSR never ran it.

**Fix shape (server-side, no DB transaction_archive needed):**
- Digest server-side, replicating the client digest exactly (handleAdds
  trade/origin logic, drops, draft_picks, waiver_budget; `type` = 'trade' only
  when adapter type==='trade', else 'waiver'; skip `status==='failed'`).
- Resolve each Yahoo `player_key` to a Sleeper id via the players map's `yh`
  (yahoo_id) bridge; unbridged players (old ids, team defenses) get a synthetic
  `yh_<num>` entry built from the adapter's `players_meta` (name/pos/team) — Yahoo
  ships names on the transaction, so coverage is 100% without the DB archive.
- Build `teamManagersMap` from `team_season_archive` (team_key `.t.N`→roster_id),
  scoped to the viewed season, and **backfill every roster referenced by the
  digested transactions** or `getTeamFromTeamManagers` throws mid-render.
- Merge synthetic players into the page's player map AND force `stale:false`, or
  `TransactionsPage` will client-refetch the player map and drop the patch.

**Why:** the player-map key space is Sleeper, not Yahoo; the components index
`players[move.player]` directly and throw on a missing roster/team, so both the
id bridge and the roster backfill are load-bearing, not nice-to-haves.
