---
name: Session & Yahoo token refresh design
description: How auth sessions are stored and why token refresh must be serialized + DB-re-read before logout
---

# Session storage
Sessions are server-side in the Postgres `sessions` table (session_id, data jsonb, expires_at). The browser cookie named `session` holds ONLY an opaque random id. Tokens + managerInfo never touch the browser.

**Why:** an earlier design stuffed the whole encrypted session (tokens + manager info) into the cookie; large/fragile, and refreshes were easy to lose.

# Token refresh — the logout trap
**Rule:** refreshing the Yahoo access token must be (1) serialized per session and (2) never delete a session without re-reading the store first.

**Why:** one page load fans out into many concurrent SvelteKit server requests. If the access token is expired, every request independently calls `yf.refreshToken()`. Yahoo ROTATES (invalidates) the refresh token on first use, so the first call succeeds and all the rest get invalid_grant — and the old code then deleted the session that had just been renewed. This is the classic "random hourly logout".

**How to apply:**
- In-process `refreshLocks` Map keyed by sessionId collapses concurrent refreshes into one shared promise (handles same-process fan-out).
- On refresh failure, re-`getSession()` from the DB; if it now holds a non-expired token (another request/instance refreshed), use it instead of logging out (handles cross-instance on autoscale).
- Always preserve the prior refresh_token when Yahoo omits a new one: `refresh_token: newTokens.refresh_token || session.tokens.refresh_token`.
