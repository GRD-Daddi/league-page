---
name: Shared matchup card (live + archived)
description: Both /matchups seasons render one shared MatchupBar; live=team-name label, archived=owner-name label, never owner on live.
---

# Shared matchup card

Live (current season) and archived (past season) `/matchups` head-to-head cards
render through ONE shared component, `src/lib/Matchups/MatchupBar.svelte`
(proportional cyan/lime "tug-of-war" score fill, single name line + avatar + points).
The caller supplies the bordered card wrapper; MatchupBar's root is a borderless button.

**Rule:** the collapsed card shows a single name line.
- Archived side → **owner name** (`ownerName ?? teamName`), from the DB archive.
- Live side → **team name** (`manager.name`), from Yahoo team managers.

**Why:** live Yahoo owner/manager names are unreliable (masked as `--hidden--`
GUIDs — see yahoo-hidden-guids.md), so owner names can only be shown for archived
seasons where they were resolved/stored. Do NOT try to surface owner names on live
cards. Both being single-line keeps the two seasons visually identical, which was an
explicit user requirement (live + past must look like the same card).

**How to apply:** if asked to change the matchup card label, keep both single-line
and keep the live label sourced from team name, not owner. Projections only appear on
live (games in progress); archived games are final so they pass no projection — this
data-driven difference is intended, not a bug.

Brackets render `<Matchup expandOverride={true}>` → MatchupBar gets `showHint={false}`
and `onToggle={null}` (non-interactive, cursor default). Keep that path working.
