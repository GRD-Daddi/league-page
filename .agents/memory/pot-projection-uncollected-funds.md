---
name: Projecting pot/payout from uncollected buy-ins
description: How the upcoming-season carryover pot and payout pool are projected before all buy-ins are collected
---

The carryover pot (potTotal) and payout pool only count PAID buy-ins, so an
upcoming/active season reads ~$0 until members actually pay. The homepage instead
shows PROJECTED figures (what it WILL be once everyone pays) with a clear "Projected"
badge, reverting to real/collected numbers once fully collected.

**Expected member count** for projection comes from `getExpectedMembers(year)` (and
`computePotData` MUST call it, not re-implement an inline calc). Fallback order:
`season_archive.num_teams` for the year → most recent PRIOR season's num_teams (league
size is stable year-to-year) → entered member_buyins count used ONLY as a floor → 12.
Do NOT fall back to the member_buyins row count as the primary source — for an upcoming/
active season it's partially populated (e.g. 3 of 12 rows) and under-projects. This bug
made the nav pot pill read $2,550 instead of $3,000 because prod's 2026
`season_archive.num_teams` was NULL, so it counted only the 3 entered buy-in rows.

**Math** (settings: potShare/poolShare derived from buy_in × split %):
- unpaidMembers = max(0, expectedMembers − paidThisYear)
- potTotalProjected = max(0, potTotal + unpaidMembers × potShare)
- payoutPoolProjected = max(0, expectedMembers × poolShare − paidOut)
- fullyCollected = expectedMembers > 0 && paidThisYear >= expectedMembers

**Why / how to apply:** the projection lives in `projection` on computePotData's return;
the real `potTotal` and `getPotTotal()` (header) stay collected-only — never swap those
for projected values, or the always-visible header total would lie. UI shows projected
only when `!fullyCollected && expectedMembers > 0`.
