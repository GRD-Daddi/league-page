# League Page - Fantasy Football League Website

## Overview
This is a SvelteKit-based web application for creating custom fantasy football league pages. It integrates with the Sleeper fantasy football platform to pull league data, display rosters, track transactions, and showcase league history.

**Current State**: Successfully configured for Replit environment. Development server running on port 5000.

## Project Information
- **Framework**: SvelteKit with Svelte 5
- **Build Tool**: Vite
- **Adapter**: Node.js adapter for Replit deployment
- **UI Library**: SMUI (Svelte Material UI)
- **API Integration**: Sleeper API for fantasy football data
- **Optional Features**: Contentful CMS for blog functionality (requires API keys)

## Recent Changes (November 9, 2025)

### Initial Replit Setup
- ✅ Configured Vite to run on port 5000 with 0.0.0.0 host
- ✅ Updated SvelteKit config to use Node adapter and disable CSRF origin checking for Replit proxy
- ✅ Created workflow for development server
- ✅ Configured deployment settings for autoscale deployment
- ✅ Updated jsconfig.json to extend SvelteKit's generated config
- ✅ All dependencies installed successfully

### Yahoo Fantasy API Migration ✅ **COMPLETE**

The application has been successfully migrated to Yahoo Fantasy API with full server-side rendering and authentication.

#### ✅ All Pages Converted to Server-Side Rendering

**Server-Side Data Loading Architecture**:
- Created `/src/lib/server/dataLoaders.js` - centralized server-only data loading functions
- Converted all 14+ pages from `+page.js` (client-side) to `+page.server.js` (server-side)
- All pages now properly access authenticated Yahoo client via `locals.yahooClient`
- Eliminated `crypto.randomBytes` browser errors by moving all Yahoo API calls server-side
- Removed dependency on client-side Svelte stores for Yahoo data fetching

**Converted Pages**:
- ✅ Homepage (`/`)
- ✅ Rosters (`/rosters`)
- ✅ Matchups (`/matchups`)
- ✅ Standings (`/standings`)
- ✅ Transactions (`/transactions`)
- ✅ Drafts (`/drafts`)
- ✅ Managers (`/managers` and `/manager`)
- ✅ Awards (`/awards`)
- ✅ Records (`/records`)
- ✅ Rivalry (`/rivalry`)
- ✅ Blog (`/blog` and `/blog/[slug]`)
- ✅ Resources (`/resources`)
- ✅ Constitution (`/constitution`)

#### ⚠️ Known Issue: Yahoo API Credentials

Yahoo API is currently returning `"consumer_key_unknown"` error despite environment variables being set. This may indicate:
1. Invalid or expired Yahoo API credentials
2. Yahoo app configuration issue (callback URLs, permissions, etc.)
3. Additional Yahoo API setup required

**Next Steps**:
1. Verify Yahoo API credentials at https://developer.yahoo.com/apps/
2. Confirm app has "Fantasy Sports" API access enabled
3. Check callback/redirect URI settings
4. Consider regenerating credentials if app was created long ago

#### ✅ Previously Completed: Yahoo Adapter Layer

**Yahoo API Adapter Layer** (`src/lib/yahoo-adapter/`):
- yahooClient.js - Yahoo OAuth wrapper with server/browser env detection
- leagueAdapter.js - League metadata, settings & playoff configuration
- rosterAdapter.js - Roster/team data with Yahoo array segment merging  
- matchupAdapter.js - Matchup/scoreboard with proper points/standings unwrapping
- transactionAdapter.js - Trades, waivers, and roster moves
- draftAdapter.js - Draft results and pick history
- playerAdapter.js - Player stats and metadata
- All adapters include comprehensive error handling and debug logging

**Platform API Wrapper** (`src/lib/utils/platformApi.js`):
- 14 unified functions routing between Yahoo and Sleeper
- Automatic platform detection from leagueInfo.js
- Seamless switching between platforms without code changes

**Error Handling**:
- Try/catch blocks in all Yahoo adapters
- Detailed JSON logging for debugging Yahoo API responses
- Graceful fallbacks to prevent crashes
- Server-side environment variable access for credentials

#### 🚀 Yahoo Setup Instructions

To use Yahoo Fantasy instead of Sleeper:

1. **Get Yahoo API Credentials:**
   - Go to https://developer.yahoo.com/apps/
   - Create a new app with Fantasy Sports API access
   - Note your App ID and App Secret

2. **Set Environment Variables:**
   Add these to your Replit Secrets:
   ```
   VITE_YAHOO_APP_KEY=your_app_id_here
   VITE_YAHOO_APP_SECRET=your_app_secret_here
   SESSION_SECRET=<random 64-char hex string>
   ```
   Generate `SESSION_SECRET` with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   `SESSION_SECRET` is **required** — without it, user login sessions will not work.

3. **Update League Configuration:**
   In `src/lib/utils/leagueInfo.js`:
   ```javascript
   export const platform = 'yahoo';  // Change from 'sleeper' to 'yahoo'
   export const leagueID = 'your_yahoo_league_key';  // Format: nfl.l.123456
   ```

4. **Restart the development server** - the app will now use Yahoo Fantasy API

#### 🔄 Switching Between Platforms

Simply change the `platform` value in `leagueInfo.js`:
- `platform = 'yahoo'` - Use Yahoo Fantasy API
- `platform = 'sleeper'` - Use Sleeper API (default)

### Yahoo OAuth Authentication ✅ **COMPLETE**

The application now includes a complete Yahoo OAuth 2.0 authentication system that allows users to log in with their Yahoo account and identifies which manager/team they own in the league.

#### Architecture

**Session Management** (`src/lib/server/sessionStore.js`):
- In-memory session store with automatic cleanup
- Stores user ID, access/refresh tokens, expiration time, and manager info
- Sessions expire after 7 days
- Hourly cleanup of expired sessions

**OAuth Routes** (`src/routes/auth/`):
- `/auth/login` - Initiates Yahoo OAuth flow with CSRF state token protection
- `/auth/yahoo/callback` - Handles OAuth callback, exchanges code for tokens, identifies manager
- `/auth/logout` - Clears session and removes cookies

**Hooks** (`src/hooks.server.js`):
- Loads session data from cookies on every request
- Automatically refreshes expired tokens (5-minute buffer)
- Injects session and authenticated Yahoo client into `event.locals`
- Clears invalid sessions on refresh failure

**User Identification**:
- Fetches authenticated user's Yahoo GUID via `/fantasy/v2/users;use_login=1`
- Cross-references with league users to find manager/team ownership
- Stores manager info (team name, roster ID, etc.) in session

**UI Components** (`src/lib/Nav/AuthButton.svelte`):
- "LOGIN" button when not authenticated
- Displays team name and "LOGOUT" button when authenticated
- Responsive design (hides team name on mobile)
- Integrated into main navigation bar

#### Security Features

- **HttpOnly Cookies**: Session ID stored in secure HttpOnly cookie
- **CSRF Protection**: State tokens validate OAuth callback authenticity
- **Isolated Clients**: Each authenticated request gets its own Yahoo client instance
- **Token Isolation**: No token leakage between users
- **Auto-Refresh**: Tokens refresh automatically before expiration
- **Secure Session Storage**: Tokens stored server-side, never exposed to browser
- **Cookie Settings**: SameSite=Lax, Secure in production, 7-day expiration

#### Optional Configuration

Set `VITE_YAHOO_REDIRECT_URI` environment variable to customize the OAuth redirect URL (defaults to current domain + `/auth/yahoo/callback`).

> **Important**: The redirect URI you register in the [Yahoo Developer Portal](https://developer.yahoo.com/apps/) **must** end with `/auth/yahoo/callback`. For example:
> - Development: `http://localhost:5000/auth/yahoo/callback`
> - Replit dev domain: `https://<your-repl-slug>.<username>.repl.co/auth/yahoo/callback`
> - Production (deployed): `https://<your-deployed-domain>/auth/yahoo/callback`
>
> A mismatch between the portal's allowed redirect URIs and the path the app sends will cause a `redirect_uri_mismatch` error and block all logins.

#### How It Works

1. User clicks "LOGIN" button in navigation
2. Redirected to Yahoo login page
3. After authentication, Yahoo redirects back to `/auth/yahoo/callback`
4. App exchanges auth code for access/refresh tokens
5. App identifies which manager/team the user owns
6. Session created and stored server-side
7. User sees their team name and logout option
8. Tokens automatically refresh when needed
9. Session persists across page refreshes for 7 days

## League Votes — Turnout Roster

Open votes on the `/votes` page show a turnout roster: every league owner with a
"Voted / Not yet" indicator, joined from the live Yahoo owner list to the
proposal's ballots. Owners who still need to vote sort to the top so the
commissioner can chase them before the deadline.

**Privacy decision**: individual ballot choices stay **anonymous at all times** —
both while a vote is open and after it closes. Only aggregate tallies (and, on
open votes, whether each owner has voted) are ever surfaced; a voter's specific
choice is never revealed. This preserves the existing anonymous-tally model.
The roster is shown to all logged-in owners (the page is already login-gated).
Imported/closed votes have no recoverable per-owner ballots, so no roster is
shown for them.

## Configuration

### Required Setup
Users need to configure their league in `/src/lib/utils/leagueInfo.js`:
1. Replace `your_league_id` with actual Sleeper league ID
2. Replace `your_league_name` with league name
3. Update homepage text
4. Configure manager information (currently commented out)
5. Add manager photos to `/static/managers/`

### Optional Blog Feature
To enable the blog:
1. Create a free Contentful account
2. Set up Blog Post and Blog Comment content models
3. Add environment variables:
   - `VITE_CONTENTFUL_ACCESS_TOKEN`
   - `VITE_CONTENTFUL_SPACE`
   - `VITE_CONTENTFUL_CLIENT_ACCESS_TOKEN`
4. Set `enableBlog` to true in leagueInfo.js

## Project Architecture

### Key Directories
- `/src/routes/` - SvelteKit routes (pages and API endpoints)
- `/src/lib/` - Reusable components and utilities
- `/static/` - Static assets (images, favicons, etc.)
- `/src/theme/` - SMUI theme configuration

### Main Routes
- `/` - Homepage with league intro
- `/matchups` - Game matchups and brackets
- `/transactions` - Trade and waiver history
- `/blog` - Blog posts (if enabled)
- `/rosters` - Team rosters
- `/managers` - Manager profiles
- `/standings` - League standings
- `/drafts` - Draft history and preview
- `/awards` - Trophy room
- `/records` - League records and rankings
- `/constitution` - League constitution
- `/resources` - Fantasy football resources

### API Endpoints
Located in `/src/routes/api/`:
- Player information fetching
- News aggregation
- Blog post/comment management (via Contentful)
- Version checking

## Development

### Running Locally
```bash
npm install
npm run dev
```
Server runs on http://0.0.0.0:5000

### Building for Production
```bash
npm run build
```

### Deployment
Configured for Replit autoscale deployment:
- Build command: `npm run build`
- Run command: `node build/index.js`

## Known Issues
- App shows errors when using placeholder league ID - this is expected until configured with real Sleeper data
- Various accessibility warnings in components (from original codebase)
- Some 404s for unconfigured manager images

## External Dependencies
- **Sleeper API**: Used for fetching league data (no API key required)
- **Contentful** (optional): CMS for blog functionality

## Notes
- The app is PWA-compatible
- Supports both dynasty and redraft leagues
- Mobile and desktop responsive
- Material Design UI components via SMUI
