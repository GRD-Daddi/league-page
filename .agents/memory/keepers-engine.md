---
name: Keepers engine
description: Durable league keeper rules and the non-obvious cross-cutting decisions for eligibility, approval, and the draft-board feed.
---

# Keepers engine

The keeper feature spans persistence → rules engine → public page → commissioner approval → draft board. Below are the durable league rules and decisions that are NOT derivable from the code.

## League rules (not derivable from Yahoo data)
- **Max 3 seasons total**: the draft/acquire year counts as year 1, so a player is keepable for 2 more seasons after that.
- **Tenure = ACTUAL kept seasons, NOT calendar years since draft.** `evaluatePlayer` computes `seasonsHeld = 1 + (count of current+isKeeper draft events in the active lineage)`; eligible while `seasonsHeld < KEEPER_MAX_SEASONS`. **Why:** the old code used `upcomingYear - acquisitionYear`, which wrongly maxed out anyone drafted ≥3 yrs ago even if never actually kept (e.g. Kenny Gainwell, Quentin Johnston, Chris Rodriguez all showed "max 3 seasons reached" despite 0 keeper events). The `transaction_archive` is empty so re-acquisitions are invisible, but recorded keeper draft rows (is_keeper) ARE reliable — so count keeper events, never the calendar. `keeperYearsRemaining()` in keeperRules.js is a raw calendar helper and is NOT authoritative (currently unused by app code).
- **Drop breaks lineage**: dropping to FA/waivers resets eligibility; a later re-acquire starts a fresh year-1 lineage.
- **Trade carries year-count AND cost** to the new team (cost is sticky to where the player was last *drafted*).
- **Cost = round last drafted** (sticky across trades). A waiver/FA pickup that was never drafted costs a **round-6** pick.
- **Board resets pre→regular season.** Eligibility must be checked against the *upcoming* draft year's pick-ownership board, and a keeper is only valid if the team still owns a pick in the keeper's cost round. A keeper **consumes** that pick.

**Why:** these are league conventions, encoded as constants + lineage reconstruction, but the *intent* above is what to preserve if refactoring.

## Cross-cutting decisions
- **Keepers page is PUBLIC.** Do NOT put `requireAuth` in its load. Yahoo has no public API, so logged-out visitors get a read-only view built from persisted selections (team names recovered from archived rosters) — not live rosters. Only select/unselect (and commissioner approve) require a session, enforced per-action.
- **Approval re-validates, never rubber-stamps.** Commissioner approve must re-run the engine against LIVE state before flipping a selection to `approved`; a pick that became illegal (player dropped/traded, eligibility exhausted, pick no longer owned) is blocked (single) or skipped (bulk). Reverting to `pending` skips validation. Validity is split into blocking `issues` vs advisory `warnings` (e.g. needs-review, cost-changed) so review-flagged picks can still be approved.
- **Only `approved` keepers feed the draft board**, consuming the team's pick in the keeper's cost round.
- **"Returning to the draft" = exhausted lineage**, i.e. a *known* lineage whose remaining keeper years hit 0 — distinct from "unknown history" players, which are review items, not returnees.
- **Per-round over-subscription is a TEAM-level warning, separate from per-selection `issues`.** `getKeeperState` attaches `team.roundConflicts` (rounds where keepers cost > owned picks), distinguishing `overSelected` (all selections, drives the /keepers manager warning) from `overApproved` (approved only, drives the draft board cell + commissioner banner). Selection is already blocked at submit time via `pickAvailable`; the warning exists for *already-over* states (e.g. a pick traded away after approval).
- **Player lineage drill-in** is built from `resolveLineage`'s full `events` chain (drafts+trades+waivers+drops, sorted) plus `startIndex` (where the active lineage began after the last reset). `evaluatePlayer` exposes `history[]` = `{year, kind, round, isKeeper, current}`, `current = i >= startIndex`. The UI timeline highlights `current` events (active lineage) and dims pre-drop ones. **Why:** the engine already reconstructs this chain to derive eligibility; the drill-in just surfaces it, so it always matches the cost/eligibility verdict. Keep round on BOTH draft and keeper-draft entries.
- **/keepers UI groups a team's eligible players by cost round** with a capacity header (`used/owned kept · N left`), dims exhausted rounds, and blocks unselectable rows. The header's `used` count must include EVERY selected player in that round — even one now ineligible-by-rules (so absent from the visible list) — or the capacity text drifts from the server's real consumption. Server `p.canSelect` stays authoritative for blocking; this is display-consistency only. **Why:** a player selected-then-made-ineligible still consumes its round pick.
