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

# Auth guards must NOT auto-redirect to an external OAuth URL
**Rule:** A `requireAuth`-style guard should redirect logged-out users to an in-app page (e.g. `/?loginRequired=<path>`) that shows a deliberate "Log in" button — never `throw redirect(302, '/auth/login')` when `/auth/login` immediately 302s to the provider.
**Why:** Auto-bouncing to an external OAuth URL breaks SvelteKit client-side navigation and, in the iframe, hangs for ~1 min on every protected-page click. The server itself responds in ~0.1s; the hang is entirely the external-redirect-in-iframe.
**How to apply:** Preserve the intended destination in a same-origin query param (validate with `/^\/(?!\/)/` to block open redirects), surface it on the landing page's login link as `?returnTo=`, and let the login endpoint store it for the post-callback bounce. A framework rewrite (React/Next) does NOT fix this — it is redirect design + iframe, not the framework.
