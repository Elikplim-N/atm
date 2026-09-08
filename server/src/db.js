import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'atm.sqlite');
export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    region TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    location_note TEXT
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER NOT NULL REFERENCES machines(id),
    channel TEXT NOT NULL CHECK (channel IN ('web', 'ussd', 'sms')),
    network_reliability INTEGER NOT NULL CHECK (network_reliability BETWEEN 1 AND 5),
    transaction_speed INTEGER NOT NULL CHECK (transaction_speed BETWEEN 1 AND 5),
    cash_availability INTEGER NOT NULL CHECK (cash_availability BETWEEN 1 AND 5),
    security INTEGER NOT NULL CHECK (security BETWEEN 1 AND 5),
    overall_satisfaction INTEGER NOT NULL CHECK (overall_satisfaction BETWEEN 1 AND 5),
    comment TEXT,
    contact_masked TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_machine ON feedback(machine_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL
  );
`);

export function maskContact(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 2)}${'*'.repeat(s.length - 4)}${s.slice(-2)}`;
}
