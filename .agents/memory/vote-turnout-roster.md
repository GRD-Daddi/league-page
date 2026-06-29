---
name: Vote turnout roster
description: How the open-vote "who voted / who hasn't" roster is built and the privacy rule behind it
---

Open votes on `/votes` show a turnout roster of every league owner with a
Voted / Not-yet flag. Built in `buildVoterRoster` in `src/lib/server/votes.js`,
attached to open (non-imported) proposals by `listProposals(session, leagueUsers)`.
`leagueUsers` comes from `loadLeagueUsers` in the votes `+page.server.js` load.

**Matching is defensive** because Yahoo masks most managers' GUIDs as
"--hidden--": a ballot's `owner_id` is the voter's real GUID, but a league-user
entry may only carry a `team_key` fallback in `user_id` (yahoo_guid null). So a
ballot counts as a match against an owner if it matches the owner's
`metadata.yahoo_guid`, OR `user_id`, OR (last resort) display name
(case-insensitive). Owners who haven't voted sort to the top.

**Privacy rule (durable decision):** individual ballot choices stay anonymous at
ALL times — open and closed. Only aggregate tallies, plus the open-vote
voted/not-voted status, are ever surfaced. Never reveal a specific owner's
choice. **Why:** the app's whole vote model was anonymous tallies; the task only
asked to surface turnout for chasing non-voters, not to de-anonymize ballots.
**How to apply:** if asked to "reveal results after close" or "show how X voted",
that's a deliberate model change — confirm before exposing per-owner choices.
