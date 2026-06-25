---
name: Stale build vs logic bug
description: How to tell a "UI shows old data/layout" report apart from a real logic regression before debugging code.
---

When a user reports the UI showing old/wrong values (e.g. "missing owner", old column header) but the current code looks correct, do NOT assume a logic bug. Distinguish stale delivery from a real regression FIRST.

**Why:** Repeatedly re-reading correct code and re-running correct SQL wastes a whole debugging loop. The screenshot was the previous committed version, not the running code.

**How to apply:**
1. Diff the screenshot against history: `git show HEAD~N:path` for the suspect component. If an OLD commit's markup matches the screenshot exactly (e.g. holder `{r.teamName}` + "Team" header), the user is seeing stale code, not a bug.
2. Check for a published deployment with `fetch_deployment_logs`. Replit published apps run the last BUILT bundle (look at the hashed chunk name / build dir in logs). A live `.replit.app` keeps serving old code until republished — dev edits don't reach it.
3. Rule out browser/preview cache: this app has no service worker. Replit's proxied dev iframe can hold stale HTML; a dev-only no-cache header in hooks.server.js (gated on `dev` from `$app/environment`, set `cache-control: no-store` on the resolved response) forces revalidation. Tell the user to hard-refresh.
4. Built-in Replit Postgres is shared between dev and deployment, so data fixes via executeSql apply to prod too — but CODE changes require republish.
