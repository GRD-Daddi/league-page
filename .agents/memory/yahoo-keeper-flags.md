---
name: Yahoo keeper flags source
description: Where Yahoo exposes keeper status/cost, why draftresults can't show it, and how the keeper archive is enriched.
---

Yahoo does NOT expose keeper status on the draft-results endpoint — a kept player
is just a normal pick there (`pick, round, team_key, player_key`, no keeper field).
Keeper status lives on the **per-team roster**: `team/{key}/roster/players` →
`player.is_keeper = { status, cost, kept }`. `kept===true` means the player was a
keeper that season. Enumerate teams via `league/{key}/teams`, then each team's
roster.

**Cost encoding is inconsistent across years** (single int = round in 2023/24;
4-char "RRPP" in 2025; blank/`0000` = unset). Don't parse it. Instead: the keeper
is drafted at their keeper round, so the **draft round already equals the keeper
cost**. We only need the `kept` boolean from rosters; the round comes from
draftresults.

**League history:** redraft 2018–2021 (0 keepers), became a keeper league in 2022
(22/22/18/17 keepers in 2022/23/24/25).

**Keeper cost rule (this league, owner-stated):** cost = the round drafted the
FIRST year the player was back in the NON-keeper pot (i.e. the most recent
non-keeper draft that starts the current chain). This is exactly what
keeperEngine.resolveLineage does: a non-keeper draft starts a fresh lineage with
that round as cost; keeper years continue it unchanged; a non-keeper draft in a
later year RESETS the chain. So a player can show `is_keeper=false` in a middle
year (returned to the pot) — that legitimately restarts cost + acquisitionYear.

**Why it was broken:** keeper import read is_keeper only from draftresults (always
false), so every season reset the lineage and cost defaulted to the LATEST draft
round. Fix: `getSeasonKeeperPlayerIds(leagueKey)` in draftAdapter reads roster
keeper flags; `saveDraftResults(...,keeperIds)` stamps is_keeper from that set;
wired into both `captureKeeperData` and `backfillKeeperHistory`.

**Debug note:** rawYahooGet auto-appends `format=json`; a manual probe fetch must
append it too or Yahoo returns XML.
