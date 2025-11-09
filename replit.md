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

The application has been successfully migrated to support both Yahoo Fantasy and Sleeper APIs through an adapter/conversion layer pattern.

#### ✅ Migration Complete - Production Ready

**Yahoo API Adapter Layer** (`src/lib/yahoo-adapter/`):
- yahooClient.js - Yahoo OAuth wrapper with credential validation
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

**Helper Functions** (11 files updated):
- All Sleeper API calls replaced with platformApi functions
- Caching and error handling preserved
- No breaking changes to existing frontend code

**API Endpoints**:
- fetch_players_info updated to use platformApi for league data

**Error Handling**:
- Try/catch blocks in all Yahoo adapters
- Detailed JSON logging for debugging Yahoo API responses
- Graceful fallbacks to prevent crashes
- Helpful error messages for missing OAuth credentials

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
   ```

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
