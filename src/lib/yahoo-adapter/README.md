# Yahoo Fantasy API Adapter

This directory contains adapters that convert Yahoo Fantasy API responses to match the Sleeper API data format expected by the frontend.

## Purpose

The League Page application was originally built for Sleeper fantasy football. These adapters allow the app to work with Yahoo Fantasy leagues without changing any frontend code or data models.

## Architecture

Each adapter module handles a specific domain:

- **yahooClient.js**: Wrapper for the yahoo-fantasy npm package, manages authentication
- **leagueAdapter.js**: Converts league metadata, settings, and scoring configuration
- **rosterAdapter.js**: Converts team rosters and user data
- **matchupAdapter.js**: Converts weekly matchups and scoreboard data
- **transactionAdapter.js**: Converts trades, waivers, and free agent pickups
- **draftAdapter.js**: Converts draft results and draft data
- **playerAdapter.js**: Converts player information and statistics

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
VITE_YAHOO_APP_KEY=your_yahoo_app_key
VITE_YAHOO_APP_SECRET=your_yahoo_app_secret
VITE_YAHOO_ACCESS_TOKEN=your_access_token (optional, can be set at runtime)
VITE_YAHOO_REFRESH_TOKEN=your_refresh_token (optional, for automatic token refresh)
```

### Yahoo App Setup

1. Go to https://developer.yahoo.com/apps/create
2. Create a new app with "Fantasy Sports" API access
3. Set redirect URI to match your deployment URL
4. Copy the Client ID (App Key) and Client Secret

### League Key Format

Yahoo league keys follow the format: `{game_id}.l.{league_id}`

Example: `449.l.123456` where:
- `449` = 2024 NFL season
- `l` = league separator
- `123456` = your league ID

## Usage

```javascript
import { 
  initializeYahooClient,
  getYahooLeagueData,
  getYahooLeagueRosters,
  getYahooLeagueMatchups
} from '$lib/yahoo-adapter';

// Initialize the client
initializeYahooClient(appKey, appSecret);

// Fetch data (returns Sleeper-formatted data)
const league = await getYahooLeagueData('449.l.123456');
const rosters = await getYahooLeagueRosters('449.l.123456');
const matchups = await getYahooLeagueMatchups('449.l.123456', 1);
```

## Data Mapping

The adapters transform Yahoo's data structures to match Sleeper's format:

### League Data
- Maps Yahoo scoring categories to Sleeper stat IDs
- Converts Yahoo roster positions to Sleeper position slots
- Translates playoff settings and waiver rules

### Roster Data
- Converts Yahoo team keys to roster IDs
- Maps player keys to consistent IDs
- Preserves win/loss records and statistics

### Matchup Data
- Transforms scoreboard to weekly matchup format
- Calculates starter vs bench players
- Preserves individual player points

### Transaction Data
- Maps trades, waivers, and free agent moves
- Converts FAAB bids to Sleeper waiver budget format
- Preserves transaction timestamps and status

### Draft Data
- Converts draft results to pick-by-pick format
- Maps draft rounds and pick numbers
- Handles keeper designations

### Player Data
- Standardizes player IDs across platforms
- Maps position abbreviations
- Converts stat categories

## Limitations

Some Yahoo-specific features don't have direct Sleeper equivalents:

- Pro leagues vs custom leagues
- Some advanced stat categories
- Certain transaction types
- Historical data before Yahoo API v2

Where possible, these are stored in the `metadata` field for future use.

## Testing

To test the adapters:

1. Set up a test Yahoo league
2. Configure environment variables
3. Run the dev server and check console for errors
4. Verify data appears correctly in the UI

## Contributing

When adding new adapters or modifying existing ones:

1. Maintain the Sleeper data structure - don't break frontend compatibility
2. Add unknown Yahoo data to `metadata` fields
3. Handle errors gracefully with try/catch blocks
4. Log warnings for missing or unexpected data
5. Document any Yahoo-specific quirks or limitations
