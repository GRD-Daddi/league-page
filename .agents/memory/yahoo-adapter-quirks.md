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

## Concurrency throttling: cap parallel Yahoo calls globally
Bursting many requests on a single OAuth token makes Yahoo return the generic
"There was a temporary problem with the server" error — and it tends to reject the
heavy endpoints (`/teams`, `/standings`, larger payloads) while light ones
(`/settings`, `/meta`, `/users;use_login=1`) keep succeeding. So a load where
settings works but teams/standings consistently fail is the fingerprint of
throttling, NOT a dead token or a per-endpoint bug.

**Why:** the homepage fanned out ~8 top-level loads, and `getYahooLeagueRosters`
fired `Promise.all` over every team's roster (10+ more), and several adapter calls
bypassed `withRetry` — 20+ simultaneous requests on one token.

**How to apply:** every Yahoo call MUST funnel through `withRetry`, which now also
acquires a slot from a global semaphore (`MAX_CONCURRENT_YAHOO_CALLS`, currently 2)
in yahooClient.js, with exponential backoff + jitter and a per-call timeout
(`callWithTimeout`, 15s, retryable) so a hung request can't monopolize a slot. When
adding a new `yf.*` call anywhere, wrap it in `withRetry(() => yf...)` or it will
bypass the limiter and reintroduce burst throttling. Verifying any of this requires
an authenticated (logged-in) page reload — unauthenticated loads never hit these
endpoints.
