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

-- max_keepers caps how many players each team may keep per season (commissioner
-- configurable; defaults to 2). Enforced server-side in the keeper engine and
-- surfaced on the public Keepers page so managers can't exceed it.
ALTER TABLE pot_settings ADD COLUMN IF NOT EXISTS max_keepers INTEGER NOT NULL DEFAULT 2;

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

-- Manual buy-in split. The commissioner enters the per-member dollars going to the
-- payout pool (pool_share) and to the carryover pot (pot_share) by hand; both are
-- stored exactly as entered and may not sum to the buy-in (the UI warns but still
-- saves). pot_split_pct is kept in sync as a derived percentage for legacy readers.
ALTER TABLE pot_settings ADD COLUMN IF NOT EXISTS pool_share NUMERIC;
UPDATE pot_settings
SET pool_share = buy_in_amount * ((100 - pot_split_pct) / 100.0)
WHERE pool_share IS NULL;
ALTER TABLE pot_settings ADD COLUMN IF NOT EXISTS pot_share NUMERIC;
UPDATE pot_settings
SET pot_share = GREATEST(0, buy_in_amount - pool_share)
WHERE pot_share IS NULL;

-- Payouts are entered as dollar amounts (payout_first/second/third), which are the
-- authoritative figures for paid-tracking and history. payout_*_pct holds each
-- place's derived share of the payout pool (amount / pool_total * 100) for redisplay.
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS payout_first_pct NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS payout_second_pct NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE season_records ADD COLUMN IF NOT EXISTS payout_third_pct NUMERIC NOT NULL DEFAULT 0;

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

-- Durable per-pick draft history, one row per drafted player per season. Feeds
-- the keeper engine: the round a player was drafted in is their sticky keeper
-- cost, and is_keeper flags re-designations across seasons. player_id is the
-- stable numeric Yahoo id (the part after ".p.") so a player's lineage can be
-- tracked across seasons even though the full player_key's game prefix changes.
CREATE TABLE IF NOT EXISTS draft_results_archive (
        year INT NOT NULL,
        league_key TEXT,
        round INT,
        pick_no INT,
        player_key TEXT NOT NULL,
        player_id TEXT,
        player_name TEXT,
        team_key TEXT,
        roster_id INT,
        is_keeper BOOLEAN NOT NULL DEFAULT false,
        cost INT,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (year, player_key)
);

CREATE INDEX IF NOT EXISTS draft_results_archive_player_idx ON draft_results_archive (player_id);

-- Durable transaction log decomposed into per-player events. Each add/drop/trade
-- becomes one row so the keeper engine can replay a player's acquisition timeline:
-- a non-trade "drop" breaks the keeper lineage; an "add" (waiver/FA) starts a new
-- lineage at the round-6 cost; a "trade" carries the existing lineage to the new
-- owner. year is the SEASON year of the move (Sep–Feb maps to the start year).
CREATE TABLE IF NOT EXISTS transaction_archive (
        id SERIAL PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        year INT NOT NULL,
        type TEXT NOT NULL,
        player_key TEXT NOT NULL,
        player_id TEXT,
        player_name TEXT,
        from_roster_id INT,
        to_roster_id INT,
        timestamp BIGINT,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (transaction_id, player_key, type)
);

CREATE INDEX IF NOT EXISTS transaction_archive_player_idx ON transaction_archive (player_id);

-- Manager-submitted keeper picks for an upcoming draft, approved by the
-- commissioner. status: 'pending' (selected by manager) or 'approved'. cost_round
-- is the draft round the keeper consumes; acquisition_year is the lineage start
-- the engine derived (informational). One keeper row per team per player per year.
CREATE TABLE IF NOT EXISTS keeper_selections (
        id SERIAL PRIMARY KEY,
        year INT NOT NULL,
        team_key TEXT NOT NULL,
        roster_id INT,
        player_key TEXT NOT NULL,
        player_id TEXT,
        player_name TEXT,
        cost_round INT,
        acquisition_year INT,
        status TEXT NOT NULL DEFAULT 'pending',
        submitted_by TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (year, team_key, player_key)
);

CREATE INDEX IF NOT EXISTS keeper_selections_year_idx ON keeper_selections (year);

-- League rule-change votes. Each proposal is one question with an option set.
-- type: 'yesno' or 'multiple'. options is the ordered list of choices owners pick
-- from. status: 'pending' (awaiting commissioner approval) -> 'open' (accepting
-- ballots) -> 'closed' (tally final). deadline auto-closes the vote once passed.
-- created_by is the proposing owner's identity (session userId); winning_option is
-- recorded at close. source distinguishes in-app votes ('app') from commissioner
-- imports of old Google Forms results ('imported'); imported votes are stored
-- already closed with their tallies in imported_tally (a JSON {option: count} map)
-- since there are no per-owner ballots to recompute from. year tags the season the
-- vote belongs to (derived from import timestamps; null for live votes).
CREATE TABLE IF NOT EXISTS vote_proposals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'multiple',
        options JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'pending',
        deadline TIMESTAMPTZ,
        created_by TEXT,
        created_by_name TEXT,
        winning_option TEXT,
        source TEXT NOT NULL DEFAULT 'app',
        imported_tally JSONB,
        year INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vote_proposals_status_idx ON vote_proposals (status);

-- One ballot per owner per proposal. The uniqueness constraint backs an upsert so
-- an owner can change their choice while the vote is still open. owner_id is the
-- voting owner's session identity (guid/team_key); choice must be one of the
-- proposal's options.
CREATE TABLE IF NOT EXISTS vote_ballots (
        id SERIAL PRIMARY KEY,
        proposal_id INT NOT NULL REFERENCES vote_proposals (id) ON DELETE CASCADE,
        owner_id TEXT NOT NULL,
        owner_name TEXT,
        choice TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (proposal_id, owner_id)
);

CREATE INDEX IF NOT EXISTS vote_ballots_proposal_idx ON vote_ballots (proposal_id);
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
