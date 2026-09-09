import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required (see server/.env.example)');
}

// A serverless function can run many concurrent container instances, each
// holding its own pool — keep each pool small so a traffic spike doesn't
// exhaust the database's max_connections. DB_POOL_MAX defaults to 3, which
// is conservative for a small self-hosted Postgres instance.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 3,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      region TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machines (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      branch_id INTEGER NOT NULL REFERENCES branches(id),
      location_note TEXT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      machine_id INTEGER NOT NULL REFERENCES machines(id),
      channel TEXT NOT NULL CHECK (channel IN ('web', 'ussd', 'sms')),
      network_reliability INTEGER NOT NULL CHECK (network_reliability BETWEEN 1 AND 5),
      transaction_speed INTEGER NOT NULL CHECK (transaction_speed BETWEEN 1 AND 5),
      cash_availability INTEGER NOT NULL CHECK (cash_availability BETWEEN 1 AND 5),
      security INTEGER NOT NULL CHECK (security BETWEEN 1 AND 5),
      overall_satisfaction INTEGER NOT NULL CHECK (overall_satisfaction BETWEEN 1 AND 5),
      comment TEXT,
      contact_masked TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_machine ON feedback(machine_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL
    );
  `);
}

export function maskContact(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}${'*'.repeat(s.length - 4)}${s.slice(-2)}`;
}
