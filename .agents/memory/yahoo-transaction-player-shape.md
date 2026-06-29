---
name: Yahoo transaction player-movement shape
description: Why Yahoo transaction imports silently saved 0 events despite the API returning hundreds of transactions.
---

The `yahoo-fantasy` library's `yf.league.transactions(leagueKey)` returns
`{ ...leagueMeta, transactions: [...] }` (top-level `.transactions`, NOT nested
under `.league[0].transactions[0].transaction`). Each transaction object carries
its per-player movement under **`player.transaction`** — an object
`{ type, source_type, destination_type, source_team_key, destination_team_key }`.

**The bug:** `convertSingleTransaction` read `playerWrapper.transaction_data`
(the RAW REST field name), which is `undefined` for the library's mapped shape.
So `adds`/`drops` came out empty for every transaction, and `saveTransactions`
(which builds events from adds/drops) returned 0 — the keeper history import
showed "0 transaction events" even though the league had hundreds. Players with
no draft/transaction history then default to round 6, so keeper costs were wrong.

**Rule:** For the library-mapped (object) player shape read `player.transaction`;
for the raw-REST (array) shape read `playerWrapper[1].transaction_data[0]`. Support
both.

**Why this hid:** convert never threw — it just produced empty moves — and the
backfill only logs `transactions failed` on a thrown error, so 0 looked like
"no data" rather than a parse miss. The live `/transactions` page was broken the
same way but went unnoticed in the offseason.

**How to verify Yahoo shapes:** raw REST + library can be probed from a Node
script using a fresh `access_token` from the Postgres `sessions` table
(`data->'tokens'->>'access_token'`). Yahoo returns HTTP 999 "Request denied" to
requests without a browser-like `User-Agent` header — add one for raw fetch
probes. Never print the token.
