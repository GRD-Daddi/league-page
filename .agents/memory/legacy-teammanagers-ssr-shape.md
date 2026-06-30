---
name: Legacy team-managers SSR shape
description: SSR loaders feeding legacy getTeamFromTeamManagers-family components must build the full {currentSeason, teamManagersMap, users} structure, never a flat users map.
---

The legacy Sleeper-era display components (Matchup, Brackets/BracketsColumn,
Transactions, RecordTeam, Manager, Awards, ...) read team name/avatar/managers
through the `getTeamFromTeamManagers` / `getTeamNameFromTeamManagers` /
`getAvatarFromTeamManagers` family. Those helpers index
`teamManagers.teamManagersMap[year][rosterID].team` and fall back on
`teamManagers.currentSeason`. Handing them a flat `{ user_id: user }` map makes
them throw the instant real (non-empty) Yahoo data renders.

**Rule:** any SSR loader that still renders Yahoo (non-archive) data through one
of those components must supply the full
`{ currentSeason, teamManagersMap: { [year]: { [rosterID]: { team, managers, roster } } }, users }`
shape — never a flat users map.

**Where the shape comes from:**
- Live/current season → `loadLiveTeamManagers` in `src/lib/server/dataLoaders.js`
  (users + rosters + leagueData; keyed by `roster.roster_id` = Yahoo `.t.N`,
  which matches the matchup adapter's `roster_id`). The browser-only store helper
  `leagueTeamManagers.js` cannot run in a loader (imports `$app/navigation`).
- Past/archive season → `buildTransactionTeamManagers` in
  `src/lib/server/transactionDigest.js` (from `team_season_archive`).

**Audit result (the pages that import the family):**
- `/matchups` live path was the only latent crash — it fed a flat users map; now
  uses `loadLiveTeamManagers`. Its past path renders from the archive schedule
  and passes `{}` (never touched by the helpers).
- `/managers`, `/manager`, `/awards`, `/records`, `/rivalry` were rewritten to
  render purely from the archive (their `+page.svelte` import only `leagueName`),
  so they never construct or pass a teamManagers object — safe by construction.

**Why:** `getTeamData` double-prefixes Yahoo's already-absolute avatar URL with
the Sleeper CDN path unless `metadata.avatar` is set, so `loadLiveTeamManagers`
normalizes a full-URL `user.avatar` into `metadata.avatar` first.
