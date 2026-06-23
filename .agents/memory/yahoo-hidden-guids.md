---
name: Yahoo hidden manager GUIDs
description: Yahoo Fantasy masks manager GUIDs/nicknames as "--hidden--"; never join teams↔users on guid
---

# Yahoo "--hidden--" manager identity

Yahoo Fantasy API returns each team manager's `guid` (and sometimes `nickname`)
as the literal string `--hidden--` for privacy — including the logged-in user's
own guid via `users;use_login=1`.

**The rule:** Never use the manager `guid` as a join/identity key. When guid is
hidden or missing, fall back to the team's `team_key` (unique & always present).
Both the roster adapter (`owner_id`) and users adapter (`user_id`) must apply the
SAME fallback so the homepage/standings join stays 1:1.

**Why:** When every team's guid collapses to `--hidden--`, an array/object keyed
by guid makes `users.find(u => u.user_id === r.owner_id)` return the FIRST user
for ALL teams (symptom: every team showed manager "MATTHEW"). Team names broke
separately because the homepage read `r.team_name` instead of `r.metadata.team_name`.

**How to apply:** Use the `isHidden(v)` helper in `rosterAdapter.js`; expose a
clean `manager_nickname` (null when hidden) so UI can hide the manager line
instead of echoing the team name. Team display name lives at
`roster.metadata.team_name`, not `roster.team_name`.

## Gating "only league members can sign in"
Do NOT verify membership by matching the logged-in user's GUID against the league user list — Yahoo masks those GUIDs, so it returns no match even for real members. Instead, after OAuth, call `client.user.game_teams(['nfl'])`, scan the (deeply nested, shape-inconsistent) response for any `team_key` containing `.l.<leagueNum>.` (leagueNum parsed from configured leagueID). That team_key is BOTH the membership proof and the user's own team. Gate must be fail-closed: create the session only if a team_key is found, else redirect to an error. Wrap the call in `withRetry` so transient Yahoo errors don't deny real members. Session userId must fall back to the team_key when GUID is null/hidden, or the auth guard (checks `session.userId` truthiness) treats the member as logged-out.
