---
name: Yahoo season-finished status
description: How to tell a Yahoo fantasy season is over (champion detection, records, awards)
---
Yahoo's league `draft_status` never advances to "complete" once a season ends — it
stays "postdraft" forever. The finished-season signal is the league resource's
`is_finished` field (1 when the season is over).

**Why:** Champion auto-detection gated on the Sleeper-style `status === 'complete'`,
but the adapter derived status only from draft_status, so it never fired.

**How to apply:** In leagueAdapter, map `is_finished == 1` → status 'complete'
(falling back to the draft_status map otherwise). The final standings `rank` on
each team (team_standings.rank, surfaced as roster.metadata.rank) is 1 for the
champion only after the season is finished.
