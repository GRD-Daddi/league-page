---
name: OAuth in Replit preview iframe & auth-guard redirect design
description: Why Yahoo/third-party OAuth login fails in the Replit preview pane, and how auth guards must redirect to avoid hanging navigation
---

# OAuth providers cannot complete login inside the Replit preview iframe
**Rule:** Third-party OAuth pages (Yahoo, Google, etc.) send `X-Frame-Options: DENY`/CSP frame-ancestors, so they refuse to render inside the Replit preview pane (an iframe). Any login flow that lands the user on the provider's page *inside the iframe* will appear to hang/spin and the auth code often "expires" before the round-trip completes.
**Why:** The Replit workspace preview is an embedded iframe; the provider blocks framing, so the user sees a blank/stuck frame instead of the login screen.
**How to apply:** To test/use OAuth, open the app in a REAL top-level browser tab via the dev domain URL (or the deployed domain), not the preview pane. Symptom signature in logs: `[OAuth] Token exchange failed: invalid_grant "Authorization code expired"` with only ONE exchange attempt (not double-redemption) = the handshake stalled, classic iframe-frame-block.

# OAuth redirect_uri must be per-environment, never a pinned secret
**Rule:** Build the Yahoo redirect_uri from `process.env.REPLIT_DOMAINS` (Replit sets it per-environment: dev container=dev domain, deployment=prod domain), falling back to the request origin. Do NOT prioritize a static `VITE_YAHOO_REDIRECT_URI` secret.
**Why:** A single pinned redirect URI (e.g. the dev domain, set in a secret shared by both environments) makes production login send Yahoo the *dev* callback. After auth Yahoo returns to the dev domain, where the `oauth_state` cookie (set on the prod domain during /auth/login) does not exist → `/auth/error?reason=invalid_state`. Symptom: prod login bounces to the janeway dev URL.
**How to apply:** `resolvePublicOrigin()` in src/lib/server/authConfig.js. Both legs (/auth/login auth request AND /auth/yahoo/callback token exchange) call getAuthConfig so the redirect_uri matches (OAuth requires it). Each environment's callback URL must be registered in the Yahoo developer app or you get `redirect_uri_mismatch` instead.

# Yahoo generic "Uh oh / invalid_request" page == live callback URL not registered
**Rule:** Yahoo's vague error page (`oauth2/error?...&error=invalid_request`, "Please specify a valid request") almost always means the redirect_uri the app SENT is not registered exactly in the Yahoo app. The app sends the live `REPLIT_DOMAINS` domain — verify that exact `https://<REPLIT_DOMAINS>/auth/yahoo/callback` is in the Yahoo app's Redirect URI(s).
**Why:** A stale `VITE_YAHOO_REDIRECT_URI` secret can differ from `REPLIT_DOMAINS` (e.g. janeway dev domains carry a rotating `-xxxxxxxx` suffix that can change between sessions; the registered/secret value lacked it). The secret is only a fallback and the code prefers REPLIT_DOMAINS, so the *registration* is what's wrong, not the code.
**How to apply:** Diagnose by printing `REPLIT_DOMAINS` vs the registered URI. The /auth/error page now surfaces the exact `redirectUri` (from getAuthConfig) with a copy button for self-service. For stable auth use the deployment's fixed domain; dev domains may rotate and need re-registering.

# A failed membership lookup must NOT be treated as "not a league member"
**Rule:** The callback's membership gate (does this Yahoo user own a team in the configured league?) must distinguish "Yahoo answered, no matching team" (genuine non-member → hard-deny `not_league_member`) from "every membership lookup errored out" (transient → retryable `yahoo_unavailable`, no session). Carry a `lookupOk`/`anySucceeded` flag up from the team-key fetch; only hard-deny when at least one lookup actually succeeded.
**Why:** Yahoo rate-limits with `status 999: Request denied`; when all membership-check calls fail the team-key list is empty, which is indistinguishable from a real non-member. The old code denied a valid owner as "not a member" on a transient rate-limit — confusing because their existing session still showed them logged in (nav MANAGER/LOGOUT) while the re-login dumped them on the login-failed page.
**How to apply:** src/routes/auth/yahoo/callback/+server.js — fetchUserTeamKeys returns `{keys, anySucceeded}`, findUsersTeamInLeague returns `{matchedKey, lookupOk}`. Session creation still requires a non-null matchedKey, so this never admits a real non-member (gate stays fail-closed; only the *error reason* changes for inconclusive lookups).

# Auth guards must NOT auto-redirect to an external OAuth URL
**Rule:** A `requireAuth`-style guard should redirect logged-out users to an in-app page (e.g. `/?loginRequired=<path>`) that shows a deliberate "Log in" button — never `throw redirect(302, '/auth/login')` when `/auth/login` immediately 302s to the provider.
**Why:** Auto-bouncing to an external OAuth URL breaks SvelteKit client-side navigation and, in the iframe, hangs for ~1 min on every protected-page click. The server itself responds in ~0.1s; the hang is entirely the external-redirect-in-iframe.
**How to apply:** Preserve the intended destination in a same-origin query param (validate with `/^\/(?!\/)/` to block open redirects), surface it on the landing page's login link as `?returnTo=`, and let the login endpoint store it for the post-callback bounce. A framework rewrite (React/Next) does NOT fix this — it is redirect design + iframe, not the framework.
