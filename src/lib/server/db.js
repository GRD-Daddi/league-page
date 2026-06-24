import pkg from 'pg';

const { Pool } = pkg;

let pool = null;
let initPromise = null;

export function getPool() {
        if (!pool) {
                const connectionString = process.env.DATABASE_URL;
                if (!connectionString) {
                        throw new Error('DATABASE_URL environment variable is not set');
                }
                pool = new Pool({ connectionString });
        }
        return pool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS pot_settings (
        id INT PRIMARY KEY DEFAULT 1,
        buy_in_amount NUMERIC NOT NULL DEFAULT 150,
        pot_split_pct NUMERIC NOT NULL DEFAULT 50,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pot_settings_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS season_records (
        year INT PRIMARY KEY,
        payout_first NUMERIC NOT NULL DEFAULT 0,
        payout_second NUMERIC NOT NULL DEFAULT 0,
        payout_third NUMERIC NOT NULL DEFAULT 0,
        first_paid BOOLEAN NOT NULL DEFAULT false,
        second_paid BOOLEAN NOT NULL DEFAULT false,
        third_paid BOOLEAN NOT NULL DEFAULT false,
        champion_team_key TEXT,
        champion_name TEXT,
        champion_recorded BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS member_buyins (
        id SERIAL PRIMARY KEY,
        year INT NOT NULL,
        team_key TEXT NOT NULL,
        member_name TEXT,
        paid BOOLEAN NOT NULL DEFAULT false,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (year, team_key)
);

CREATE TABLE IF NOT EXISTS pot_ledger (
        id SERIAL PRIMARY KEY,
        year INT,
        winner_team_key TEXT,
        winner_name TEXT,
        amount NUMERIC NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side session store. The browser cookie holds only an opaque random
-- session_id; all tokens + manager info live here so the cookie stays small and
-- token refreshes are persisted in one place (survives restarts and refreshes).
CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

INSERT INTO pot_settings (id, buy_in_amount, pot_split_pct)
VALUES (1, 150, 50)
ON CONFLICT (id) DO NOTHING;

-- champion_source distinguishes commissioner-entered champions ('manual') from
-- ones auto-detected from Yahoo final standings ('auto'). Manual records are
-- treated as overrides and are never overwritten by auto-detection.
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS champion_source TEXT;
UPDATE season_records
        SET champion_source = 'manual'
        WHERE champion_recorded = true AND champion_source IS NULL;

-- pot_adjustment lets the commissioner set the carryover pot directly (e.g. to
-- seed a balance carried over from before this app existed). It's a single
-- offset added to the derived pot total, so paid buy-ins still accumulate on top.
ALTER TABLE pot_settings ADD COLUMN IF NOT EXISTS pot_adjustment NUMERIC NOT NULL DEFAULT 0;

-- Per-place "enabled" flags let the commissioner hide/disable payout spots that
-- the league doesn't actually pay (e.g. only 1st & 2nd get paid → disable 3rd).
-- Disabled places are hidden on the public page and excluded from pool math.
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS first_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS second_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS third_enabled BOOLEAN NOT NULL DEFAULT true;

-- End-of-year points-leader bonus: a side payout the regular-season points leader
-- collects directly from every other member (default $10 each), separate from the
-- carryover pot and the payout pool. points_leader_amount is the per-member share.
ALTER TABLE pot_settings ADD COLUMN IF NOT EXISTS points_leader_amount NUMERIC NOT NULL DEFAULT 10;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS points_leader_team_key TEXT;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS points_leader_name TEXT;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS points_leader_recorded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS points_leader_paid BOOLEAN NOT NULL DEFAULT false;

-- Durable league history — the league's OWN copy of season results, independent
-- of Yahoo. Captured from final standings so the "person to beat", Trophy Room,
-- and records keep working even if the Yahoo API becomes unavailable or a past
-- league is deleted. season_archive is one header row per season; the richer
-- per-team / per-week archives (rosters, matchups) are layered on later.
CREATE TABLE IF NOT EXISTS season_archive (
        year INT PRIMARY KEY,
        league_key TEXT,
        league_name TEXT,
        status TEXT,
        num_teams INT,
        champion_team_key TEXT,
        champion_name TEXT,
        runner_up_team_key TEXT,
        runner_up_name TEXT,
        third_team_key TEXT,
        third_name TEXT,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-team final standing for an archived season (one row per team per year).
CREATE TABLE IF NOT EXISTS team_season_archive (
        year INT NOT NULL,
        team_key TEXT NOT NULL,
        team_name TEXT,
        manager_name TEXT,
        logo_url TEXT,
        final_rank INT,
        wins INT,
        losses INT,
        ties INT,
        points_for NUMERIC,
        points_against NUMERIC,
        playoff_seed INT,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (year, team_key)
);

-- Final roster for an archived season (one row per team per year). The roster's
-- players are stored as a JSON array of detail objects so the squad survives even
-- if Yahoo's player data later disappears; no external player map is needed.
CREATE TABLE IF NOT EXISTS roster_archive (
        year INT NOT NULL,
        team_key TEXT NOT NULL,
        roster_id INT,
        team_name TEXT,
        manager_name TEXT,
        logo_url TEXT,
        players JSONB NOT NULL DEFAULT '[]'::jsonb,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (year, team_key)
);

-- Every matchup score for an archived season, one row per team-side. Two rows
-- sharing (year, week, matchup_id) are opponents. Keyed by roster_id so re-runs
-- update in place rather than duplicating.
CREATE TABLE IF NOT EXISTS matchup_archive (
        year INT NOT NULL,
        week INT NOT NULL,
        matchup_id INT NOT NULL,
        roster_id INT NOT NULL,
        team_key TEXT,
        team_name TEXT,
        points NUMERIC,
        is_playoffs BOOLEAN NOT NULL DEFAULT false,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (year, week, matchup_id, roster_id)
);

-- Commissioner-maintained draft pick ownership for an upcoming draft. Stores how
-- many picks each team owns in each round (1 = standard, 0 = traded away, 2+ =
-- acquired). One row per team per round per year. This is manual data because the
-- platform's predicted draft board is unreliable before the draft happens.
CREATE TABLE IF NOT EXISTS draft_pick_ownership (
        year INT NOT NULL,
        team_key TEXT NOT NULL,
        team_name TEXT,
        round INT NOT NULL,
        picks INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (year, team_key, round)
);
`;

/**
 * Ensures the schema exists and defaults are seeded. Runs once per process.
 */
export function initDb() {
        if (!initPromise) {
                initPromise = getPool()
                        .query(SCHEMA)
                        .catch((err) => {
                                initPromise = null;
                                throw err;
                        });
        }
        return initPromise;
}

/**
 * Runs a query after ensuring the schema is initialized.
 */
export async function query(text, params) {
        await initDb();
        return getPool().query(text, params);
}
