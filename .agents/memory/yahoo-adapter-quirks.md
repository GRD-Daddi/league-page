---
name: Yahoo adapter quirks
description: Non-obvious traps when working with the yahoo-fantasy library and our Yahoo adapter layer.
---

# Yahoo adapter quirks

## Traded draft picks are stripped by the library
The `yahoo-fantasy` npm library's `mapTransactions` (helpers/leagueHelper.mjs) only
maps the `players` segment of a trade transaction and **drops the `picks` segment
entirely**. So `yf.league.transactions()` never surfaces traded draft picks.

**Why:** this is why upcoming-draft pick ownership (incl. traded picks) could not be
shown — the data is in Yahoo's API but the library discards it.

**How to apply:** to get traded picks, bypass the library mapper and call the raw
endpoint via the library's generic `yf.api('GET', url)` method
(`league/{key}/transactions;types=trade`), then parse the `picks` collection
yourself. Picks live under the trade transaction segment that has a `picks` key;
each pick has `original_team_key` / `source_team_key` / `destination_team_key` /
`round`. Replay trades chronologically (by `timestamp`) keyed by
`round:originalTeam` to get net current ownership. A Yahoo league key is one season,
so all traded picks in the current league key belong to that league's draft.

## rostersResult.rosters is a MAP, not an array
`loadLeagueRosters` → `processRosters` returns `{ rosters: rosterMap, ... }` where
`rosters` is an object keyed by id, not an array. Always iterate with
`Object.values(rostersResult.rosters)`. Using `for...of` directly throws
`TypeError: rosters is not iterable`.

## Team identity: use the Yahoo team number, not roster_id
In `rosterAdapter`, `roster_id` is just the array `index + 1`, which may not equal
the Yahoo `.t.N` team number. When correlating rosters with anything that carries
Yahoo team keys (e.g. traded picks), key off the numeric team number parsed from
`team_key` via `/\.t\.(\d+)/` on both sides — not `roster_id`.

## Transient Yahoo failures
`consumer_key_unknown` and "There was a temporary problem with the server" are
intermittent Yahoo-side errors; `withRetry` in yahooClient.js handles the former.
The dev server occasionally needs a restart after a transient Yahoo token "cb is
not a function" crash.
