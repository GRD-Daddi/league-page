---
name: Keeper cross-season team_key bridge
description: Why the keeper engine must remap preseason fallback rosters to the upcoming league's team_key by owner, not by team number.
---

The keeper engine evaluates the UPCOMING draft year, but in the preseason the
upcoming Yahoo league has no rosters, so `loadLeagueRostersWithFallback` returns
LAST season's rosters. Yahoo issues a brand-new league key every season AND
reshuffles the `.t.N` team-number suffix between seasons, so those fallback
rosters carry keys that differ from where draft pick ownership and keeper
selections are stored (the upcoming league's keys).

**Rule:** Bridge each fallback roster to its upcoming-season franchise by OWNER,
never by `.t.N` suffix or roster_id.
- Primary identity: `yahoo_guid` (roster `owner_id` is the guid when visible, else
  that season's team_key; current-league `users[].metadata.yahoo_guid`).
- Hidden managers have no guid → secondary bridge by unambiguous (deduped,
  normalized) team name. Fully-hidden + renamed teams can't be bridged and will
  show "no pick" — acceptable edge of an edge.

**Why:** `.t.N` is NOT stable across seasons — verified via team_season_archive:
2026 `t.3`=chris but 2025 `t.3`=kevin. Only owner identity is stable. Matching by
team number would assign keepers/picks to the WRONG franchise.

**How to apply:** Remap lives in `getKeeperState` (it has both current `users` and
the fallback `rostersMap`); it builds a `teamKeyRemap` passed into
`computeKeepers`. Once remapped, `team.teamKey` is the upcoming key, so pick
lookup, `saveKeeperSelection` persistence, `consumedByTeamRound`, public
`buildPublicView`, and the select/unselect `authForTeam` check (compares to the
session's current-season key) all stay consistent. If you ever bypass the remap,
every team shows "no pick in round X to use" and hidden managers get 403 on select.
