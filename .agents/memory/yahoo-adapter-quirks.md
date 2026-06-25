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

**Where it is / isn't wired:** the homepage "Draft Picks by Team" board DOES consume
`getYahooTradedPicks` (commissioner-entered ownership overrides it when present). The
Transactions-feed adapter (`transactionAdapter.convertSingleTransaction`) still
outputs `draft_picks: []` — it only parses the `players` segment, never `picks` — so
traded picks do NOT appear as line items on the Transactions history page. Closing
that gap requires both parsing picks into Sleeper-shaped `draft_picks` AND teaching
the trade-render pipeline (moves/TransactionMove) to display pick rows.

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

## Transient Yahoo failures (and the resolved-error-payload trap)
`consumer_key_unknown` and "There was a temporary problem with the server. Please
try again shortly." are intermittent Yahoo-side errors. `withRetry` in
yahooClient.js retries on a broadened set of transient patterns (temporary problem,
try again, rate limit, timeout, ECONNRESET/REFUSED, 50x).

**Trap:** `yf.league.teams()` does NOT throw on the "temporary problem" error — it
RESOLVES with an error-shaped payload `{ description, 'yahoo:uri', ... }` that lacks
the `league[0].teams[0].team` array. Reading the shape then silently yields
`teamsArray = []`, which surfaces as "rosters showing no one" / empty draft-pick
chips. **Why it matters:** both getYahooLeagueRosters and getYahooLeagueUsers
depend on this call. **How to apply:** fetch teams through `fetchLeagueTeams()` in
rosterAdapter, which throws a descriptive Error when the teams array is missing so
withRetry actually retries the resolved-error payload. Any other Yahoo call that can
return a resolved-error payload needs the same throw-to-retry wrapper; plain
withRetry alone won't catch non-thrown failures.

## Draft rounds can be empty when settings are degraded
Home page draft-pick chips only render when draftRounds is truthy. Yahoo's settings
parse is fragile and can yield null draft_rounds + empty roster_positions. Fallback
chain: settings.draft_rounds -> roster_positions(excl IR) -> max loaded roster size
-> default 15, so the section never renders blank.

The dev server occasionally needs a restart after a transient Yahoo token "cb is
not a function" crash.

## Team-COLLECTION endpoints fail while single-resource endpoints work (offseason)
The generic "There was a temporary problem with the server" error is NOT caused by
concurrency. We added a global semaphore (`MAX_CONCURRENT_YAHOO_CALLS=2`),
exponential backoff+jitter, per-call timeout, and funneled every `yf.*` through
`withRetry` — and `/teams` + `/standings` STILL failed every time while
`/settings`, `/league/metadata`, and the OAuth GUID call kept succeeding. So
throttling-down did NOT fix it; the fingerprint is endpoint-class-specific, not load.

**The real pattern:** Yahoo errors on the endpoints that **enumerate the whole team
collection** (`/league/{key}/teams`, `/league/{key}/standings`, `/scoreboard`) — most
reliably during the offseason / pre-draft window — while **single-resource**
endpoints (`/league/{key}/metadata`, `/league/{key}/settings`,
`/team/{teamKey}/metadata`, `/team/{teamKey}/roster`) keep working for the same league.

**Why:** this is Yahoo-side and class-specific; retries/concurrency caps can't fix a
collection endpoint that the server refuses to serve.

**How to apply:** when the collection endpoints fail, enumerate teams INDIVIDUALLY.
`fetchLeagueTeams()` in rosterAdapter now falls back (after /teams then /standings) to
`fetchTeamsIndividually()`: it reads canonical `league_key` + `num_teams` from
`yf.league.meta()` (works), builds deterministic team keys `{league_key}.t.{N}` for
N=1..num_teams, and fetches each via `yf.team.meta()`. `yf.team.meta` returns a flat
team object that `convertRosterToSleeperFormat`'s non-array branch already handles.
Keep the semaphore/withRetry wrapping regardless — it's good hygiene, just not the cure.

## Past-season data: walk the `renew` chain, don't hardcode keys
Yahoo issues a BRAND-NEW league key every season, so last season's standings live
under a different key than the current one. `previousLeagueKeys` in leagueInfo.js is
typically empty, so historical lookups (Trophy Room / last champion) find nothing and
render placeholders.

**Why:** the current season is never `status==='complete'`, and without prior keys
there is nowhere to read a completed season's final standings.

**How to apply:** Yahoo's raw league metadata has a `renew` field
("GAME_l_LEAGUEID", e.g. "449_l_744586") pointing at the prior season's league. The
library returns the raw meta object, so `meta.renew` is present even though it isn't
explicitly mapped. `yahooRenewToKey()` in leagueAdapter converts it to a real key and
populates `previous_league_id`; `getLastSeasonPodium` (pot.js) walks that chain (BFS
with a seen-set + depth guard) to auto-discover completed seasons.
