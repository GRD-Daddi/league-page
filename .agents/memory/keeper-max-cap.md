---
name: Keeper per-team cap
description: How the configurable "max keepers per team" limit is accounted for and enforced across selection, UI, and approval.
---

# Keeper per-team cap (max_keepers)

Commissioner-configurable cap on how many players a team may keep per season.
Stored as `pot_settings.max_keepers` (single-row league settings, default 2),
exposed via `getSettings().maxKeepers`, and surfaced on the public Keepers page +
commissioner Keepers tab (`updateKeeperSettings` action).

## Rule: one accounting metric everywhere
All three enforcement points MUST use the **same all-selections count** —
`totalSelected = sum of consumedByTeamRound` (every persisted selection for the
team, the same count round-conflict logic uses) — exposed as `team.atLimit`:
- UI gate: `p.blockedByLimit` / `team.atLimit` disable the Keep button.
- Server save: `saveKeeperSelection` rejects on `team.atLimit`.
- Approval: over-cap selections get an `issues` entry ("Over the keeper limit")
  so `sel.valid` is false and `approveKeeper`/`approveAllKeepers` skip them.

**Why:** an earlier version mixed two metrics — UI used `totalSelected` but the
save path used `team.selectedCount` (only selections that still map to a current
roster player). With a stale selection (player dropped/traded) the two diverge,
so the UI could show "at limit" while the server still allowed an insert (or the
reverse), producing contradictory badge vs. blocked state. `selectedCount` is
roster-filtered; `totalSelected`/`atLimit` is not — use the latter for the cap.

## Over-cap ordering (which selections are "over")
When a team has more selections than the cap (selections predate the cap, or the
commissioner lowered it), the overflow is chosen by sorting **approved first,
then earliest cost_round**, and marking everything past `maxKeepers` as over the
limit. This protects already-approved keepers and lower-round picks.

**How to apply:** any new keeper count/limit check should read
`team.atLimit`/`state.maxKeepers`, never re-derive from roster-filtered counts.
