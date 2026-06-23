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
