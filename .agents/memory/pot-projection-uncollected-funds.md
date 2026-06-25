---
name: Projecting pot/payout from uncollected buy-ins
description: How the upcoming-season carryover pot and payout pool are projected before all buy-ins are collected
---

The carryover pot (potTotal) and payout pool only count PAID buy-ins, so an
upcoming/active season reads ~$0 until members actually pay. The homepage instead
shows PROJECTED figures (what it WILL be once everyone pays) with a clear "Projected"
badge, reverting to real/collected numbers once fully collected.

**Expected member count** for projection comes from `season_archive.num_teams` for the
year (league is 12 teams), falling back to the member_buyins row count. Do NOT use the
member_buyins count alone — it's often partially populated (e.g. only 3 rows for a new
season) and would under-project.

**Math** (settings: potShare/poolShare derived from buy_in × split %):
- unpaidMembers = max(0, expectedMembers − paidThisYear)
- potTotalProjected = max(0, potTotal + unpaidMembers × potShare)
- payoutPoolProjected = max(0, expectedMembers × poolShare − paidOut)
- fullyCollected = expectedMembers > 0 && paidThisYear >= expectedMembers

**Why / how to apply:** the projection lives in `projection` on computePotData's return;
the real `potTotal` and `getPotTotal()` (header) stay collected-only — never swap those
for projected values, or the always-visible header total would lie. UI shows projected
only when `!fullyCollected && expectedMembers > 0`.
