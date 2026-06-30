---
name: Payouts-driven pot/payout model
description: How the commissioner pot/payout split is computed and stored
---

The commissioner enters DOLLARS, not percentages. The place payouts drive everything.

Inputs:
- buy_in_amount (global, pot_settings)
- points_leader_amount (global, pot_settings)
- payout_first/second/third (per year, season_records) — entered in dollars

Derived:
- total payout pool = first + second + third
- pool_share (per member) = total payout pool / expectedMembers
- potShare (per member)  = buy_in - pool_share  (remainder feeds carryover pot)
- pot_split_pct = (buy_in - pool_share)/buy_in*100  (legacy readers only)
- payout_*_pct = amount/totalPool*100  (redisplay only)

**Why:** Matthew wants to type actual dollar payouts and have the pool + per-member
split fall out automatically. Dollars stay authoritative downstream (paidOut,
archive, awards untouched); pct columns are display-only.

**How to apply:**
- pool_share/pot_split_pct are GLOBAL (pot_settings id=1) but are recomputed from the
  CURRENT season's payouts ONLY. setPayouts updates pot_settings only when
  year === getCurrentSeasonYear(), so editing past-year payouts can't clobber current
  settings.
- updateSettings (buy-in/bonus) does NOT change pool_share's dollar value; it only
  re-clamps pool_share to the new buy-in and recomputes pot_split_pct.
- getSettings clamps pool_share to [0, buy_in]; if payouts/member exceed buy-in the
  extra is assumed to come from the carryover pot (UI warns via poolExceedsBuyIn).
- getExpectedMembers(year): season_archive.num_teams(year) → most recent PRIOR season's
  num_teams → member_buyins count as a FLOOR only → 12. NEVER use member_buyins count as
  the primary fallback (under-projects upcoming seasons whose num_teams isn't captured yet).
  computePotData calls this helper; don't re-add an inline calc. Guard members||12 vs div-by-zero.
