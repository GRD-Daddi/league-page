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

### Yahoo Fantasy API Migration (In Progress)
- ✅ Installed yahoo-fantasy npm package
- ✅ Created Yahoo API adapter layer in `src/lib/yahoo-adapter/`
  - yahooClient.js - Yahoo API client wrapper
  - leagueAdapter.js - League metadata conversion
  - rosterAdapter.js - Roster/user data conversion
  - matchupAdapter.js - Matchup/scoreboard conversion
  - transactionAdapter.js - Transaction data conversion
  - draftAdapter.js - Draft data conversion
  - playerAdapter.js - Player data conversion
- ✅ Created unified platformApi.js wrapper for platform-agnostic API calls
- ✅ Updated leagueInfo.js to support platform selection (yahoo/sleeper)
- ✅ Fixed critical array unwrapping bugs in all adapters
- 🚧 In Progress: Updating helper functions to use platformApi
- ⏳ Pending: Update API server endpoints
- ⏳ Pending: Test with real Yahoo league

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
