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

**Where it is wired (all three now consume picks):** homepage board, the Transactions
feed, AND the commissioner pick-ownership editor (auto-seeds its grid from Yahoo
traded picks when no DB ownership is saved; DB stays authoritative). The transactions
digester (`leagueTransactions.js`) already renders `draft_picks` — the only gap was
the adapter emitting `[]`. **Gotcha:** that digester reads `transaction.roster_ids`
(NUMBERS) for `indexOf`, so a pick-only trade (no player adds/drops) renders nothing
unless you ALSO push the pick teams into `roster_ids`/`consenter_ids`. Yahoo does not
stamp a draft season on a traded pick — approximate it from the trade year (display
only).

## The library's api() crashes the whole Node process on a non-JSON body
`YahooFantasy.api()` does an UNGUARDED `JSON.parse(data)` inside the https response
`end` callback. When Yahoo returns a plain-text body (e.g. "Request denied" while
throttling a burst), that parse throws SYNCHRONOUSLY in the event handler — it escapes
the promise, so `try/catch`/`withRetry` around the await never catch it. Result:
uncaught exception kills the server AND the original request hangs forever. We hit
this on archive backfill (fans out many scoreboard calls).

**Why:** every library helper (`scoreboard`, `transactions`, `meta`, `roster`,
`draft_results`, ...) routes through `api()`, so ANY Yahoo call could crash, not just
raw ones.

**How to apply:** use `rawYahooGet(url, client)` in yahooClient.js — it does its own
fetch with the bearer token and parses defensively (non-JSON → normal thrown Error,
"Request denied" marked retryable). `createAuthenticatedClient` overrides `client.api`
so GET+bearer-token calls auto-route through it (the library resolves with the full
parsed `data`, same shape rawYahooGet returns). Bypassing api() also bypasses its
token_expired auto-refresh, so rawYahooGet re-implements a single refresh+retry via
`client.refreshToken`.

## Yahoo 999 "Request denied" = missing browser User-Agent on GETs
Under burst load (keeper/archive backfill fanning out many calls) Yahoo's anti-abuse
layer returns a non-JSON body `999 Request denied` to API GETs that arrive with the
default Node/undici User-Agent. `rawYahooGet` classified this as retryable, retries
exhausted, and the call failed — so `transaction_archive` stayed EMPTY (0 rows) and
the keeper engine had no drop/add data to reset drafted→dropped→re-picked players.

**Why it's sneaky:** a single low-volume call (e.g. a one-off diagnostic) usually
slips through, so it looks intermittent. It's the SERVER's burst of GETs that gets
denied, not any one request.

**How to apply:** `rawYahooGet` (yahooClient.js) MUST send a browser-like
`User-Agent` header (a desktop Chrome UA string). This is the GET path for ALL Yahoo
data loads via the `client.api` override, so the header fixes every endpoint, not
just backfill. Don't remove it. (Server-only — `User-Agent` is a forbidden header in
browsers, but Yahoo GETs always run server-side here.)

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
