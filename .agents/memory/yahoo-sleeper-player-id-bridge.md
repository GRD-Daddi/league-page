---
name: Bridging Yahoo player keys to the Sleeper player dataset
description: How to resolve Yahoo player_key (draft picks, transactions) to names using the Sleeper players map
---

The page-level players map comes from /api/fetch_players_info (built from Sleeper's
/v1/players/nfl) and is keyed by SLEEPER player IDs with short fields {fn,ln,pos,t}.
But Yahoo-sourced data (e.g. draft picks: pick.player_id = Yahoo player_key "{game}.p.{id}")
uses Yahoo's id space. The two DON'T share keys, so a naive players[pick.player_id] misses
and UI falls back to printing the raw key (e.g. "414.p.30154").

**Bridge:** Sleeper player records carry a `yahoo_id` field (~6750 of ~12200 players).
The numeric segment of a Yahoo player_key (the id after ".p.") equals that yahoo_id, and it's
stable across seasons (only the leading game-key prefix changes per year). So: add `yh: yahoo_id`
to the computed player payload, build a `String(yahoo_id) -> player` index, and resolve by
extracting `/\.p\.(\d+)/` from the Yahoo key.

**Why / how to apply:** any feature surfacing Yahoo player_keys (drafts, transactions, rosters
if they ever expose raw keys) must go through this bridge, not a direct map lookup. Players with
no Sleeper yahoo_id (defenses, obscure/older players) won't resolve — show a graceful
"Unknown Player", never the raw key. Avoid per-key Yahoo player.meta() fetches for bulk views
(drafts load ALL historical seasons → hundreds of picks → far too many API calls).
