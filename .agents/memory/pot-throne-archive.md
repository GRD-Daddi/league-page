---
name: Pot "person to beat" + durable history archive
description: How last season's champion / "to be crowned" is sourced and the ledger-year coupling that gates the throne reset
---

# Person-to-beat ("To Be Crowned") rule

The homepage "The Person To Beat" = last season's 1st-place finisher, shown ONLY
while they have NOT yet claimed the pot (their reigning win was their first in a
row). Once they go back-to-back AND the pot is awarded, the throne resets and the
card shows "To be crowned" until a new champion repeats.

- `pot.champion` carries `reigning`, `backToBackAchieved`, and `potClaimed`.
- UI shows person-to-beat when `reigning && !potClaimed`.

# Durable history archive

`season_archive` / `team_season_archive` are the league's OWN copy of results so
history survives if Yahoo's API dies. `getLastSeasonPodium` snapshots last
season's podium into them (best-effort, never blocks the live podium).
`getChampionHistory` merges archived champions (source `archive`) to fill gaps
without overriding manual/recorded entries. Yahoo stays source-of-truth while up.

**Why / critical coupling:** `potClaimed` looks up `pot_ledger` by the *reigning
champion's year*. Therefore `awardPot` MUST insert the ledger row with
`year = status.reigning.year` (server-derived), NOT the form's year. If these
drift, a claimed pot won't reset the throne. Keep them in lockstep.

**How to apply:** Any new pot-award path or any change to how reigning year is
computed must keep the ledger `year` equal to the reigning year used by the
`potClaimed` query in `computePotData`.

# Payout place toggles + points-leader bonus

Commissioner can disable a payout place (1st/2nd/3rd) via `*_enabled` flags on
`season_records`. Disabled places are hidden on the homepage AND excluded from
`paidOut` in `computePotData`.

**Why / invariant:** a disabled place must never carry a stale `*_paid` flag — if
it did, re-enabling would instantly shrink the pool with no explicit pay action.
So: `togglePayoutPaid` only writes when the place is currently enabled
(`WHERE ... AND *_enabled = true`), and `togglePayoutEnabled` clears `*_paid`
whenever it disables a place. Keep both guards if you touch payout toggling.

The end-of-year points-leader bonus is a SIDE payout, fully separate from the
carryover pot and the payout pool. Per-member amount = `pot_settings.points_leader_amount`
(default $10); leader collects `amount × (members − 1)` where members =
`COUNT(*) FROM member_buyins WHERE year`. It's peer-to-peer (paid directly to the
leader), so the app only records leader + settled flag, never moves pot money.
