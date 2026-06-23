---
name: Yahoo roster data shape
description: Shape of data.rosters on the homepage (and other pages using loadLeagueRosters).
---

# Yahoo Roster Data Shape

`loadLeagueRosters` in `dataLoaders.js` returns `{ rosters: rosterMap, startersAndReserve }`.

The homepage server loader passes `rostersResult?.rosters` as `data.rosters`, so `data.rosters` is a **plain object keyed by `roster_id`**.

## To get standings array:
```js
Object.values(data.rosters).sort((a, b) => {
  const winDiff = (b.settings?.wins ?? 0) - (a.settings?.wins ?? 0);
  if (winDiff !== 0) return winDiff;
  return (b.settings?.fpts ?? 0) - (a.settings?.fpts ?? 0);
})
```

## Each roster object has:
- `roster_id` — numeric ID
- `team_name` — Yahoo team name (from `teamMeta.name`)
- `owner_id` — Yahoo GUID (matches `user.user_id` in the users array)
- `team_key` — full Yahoo team key (e.g. `461.l.744586.t.1`)
- `settings.wins` — integer
- `settings.losses` — integer
- `settings.fpts` — float (points for)
- `settings.record` — string e.g. `"8-2"`

## Users array (`data.users`):
- `user_id` — Yahoo GUID (matches `roster.owner_id`)
- `display_name` — nickname or team name
- `metadata.team_key` — Yahoo team key

**Why:** The object-keyed shape (not array) is non-obvious. Cross-reference to manager names requires `users.find(u => u.user_id === roster.owner_id)`.
