import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, initSchema } from './db.js';

const branches = [
  { name: 'Accra Main', region: 'Greater Accra' },
  { name: 'Kumasi Adum', region: 'Ashanti' },
  { name: 'Takoradi Market Circle', region: 'Western' },
  { name: 'Tamale Central', region: 'Northern' },
  { name: 'Cape Coast', region: 'Central' },
];

const machinesByBranch = {
  'Accra Main': ['ATM-ACC-01', 'ATM-ACC-02', 'ATM-ACC-03'],
  'Kumasi Adum': ['ATM-KUM-01', 'ATM-KUM-02'],
  'Takoradi Market Circle': ['ATM-TKD-01', 'ATM-TKD-02'],
  'Tamale Central': ['ATM-TML-01'],
  'Cape Coast': ['ATM-CPC-01', 'ATM-CPC-02'],
};

// Rough per-machine "health" profile to make the trend/alert views meaningful,
// rather than uniform random noise across every machine.
const machineProfiles = {
  'ATM-ACC-01': { base: 4.4, drift: 0, volatility: 0.4 },
  'ATM-ACC-02': { base: 3.8, drift: -0.01, volatility: 0.6 },
  'ATM-ACC-03': { base: 4.1, drift: 0, volatility: 0.4 },
  'ATM-KUM-01': { base: 4.2, drift: 0, volatility: 0.4 },
  'ATM-KUM-02': { base: 2.8, drift: -0.015, volatility: 0.7 },
  'ATM-TKD-01': { base: 3.6, drift: 0.01, volatility: 0.5 },
  'ATM-TKD-02': { base: 4.0, drift: 0, volatility: 0.4 },
  'ATM-TML-01': { base: 2.5, drift: 0, volatility: 0.8 },
  'ATM-CPC-01': { base: 3.9, drift: 0, volatility: 0.4 },
  'ATM-CPC-02': { base: 4.3, drift: 0, volatility: 0.3 },
};

const channels = ['web', 'ussd', 'sms'];
const comments = [
  'Machine dispensed cash quickly, no issues.',
  'Network was slow, transaction timed out once.',
  'Ran out of cash in the afternoon.',
  'Screen was hard to read in sunlight.',
  'Card was almost captured, felt unsafe.',
  'Great experience, very fast today.',
  'Long queue but machine itself worked fine.',
  'Receipt printer was out of paper.',
  null,
  null,
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function sample(mean, volatility) {
  const noise = (Math.random() + Math.random() + Math.random() - 1.5) * volatility;
  return clamp(Math.round(mean + noise), 1, 5);
}

function randomPhone() {
  return `02${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function maskLike(phone) {
  return `${phone.slice(0, 2)}${'*'.repeat(phone.length - 4)}${phone.slice(-2)}`;
}

// Inserts rows in batches of a single multi-row INSERT each, since the
// database may be a remote VPS where 1000+ one-row-per-round-trip inserts
// would be latency-bound.
async function batchInsertFeedback(rows) {
  const CHUNK = 200;
  const columns = [
    'machine_id',
    'channel',
    'network_reliability',
    'transaction_speed',
    'cash_availability',
    'security',
    'overall_satisfaction',
    'comment',
    'contact_masked',
    'created_at',
  ];

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values = [];
    const placeholders = chunk.map((row, r) => {
      const base = r * columns.length;
      values.push(...row);
      return `(${columns.map((_, c) => `$${base + c + 1}`).join(', ')})`;
    });

    await pool.query(
      `INSERT INTO feedback (${columns.join(', ')}) VALUES ${placeholders.join(', ')}`,
      values
    );
  }
}

async function seed() {
  await initSchema();

  const { rows: existing } = await pool.query('SELECT COUNT(*) AS c FROM branches');
  if (Number(existing[0].c) > 0) {
    console.log('Database already seeded, skipping.');
    await pool.end();
    return;
  }

  const branchIds = {};
  for (const b of branches) {
    const { rows } = await pool.query(
      'INSERT INTO branches (name, region) VALUES ($1, $2) RETURNING id',
      [b.name, b.region]
    );
    branchIds[b.name] = rows[0].id;
  }

  const machineIds = {};
  for (const [branchName, codes] of Object.entries(machinesByBranch)) {
    for (const code of codes) {
      const { rows } = await pool.query(
        'INSERT INTO machines (code, branch_id, location_note) VALUES ($1, $2, $3) RETURNING id',
        [code, branchIds[branchName], `${branchName} branch premises`]
      );
      machineIds[code] = rows[0].id;
    }
  }

  const DAYS = 60;
  const now = Date.now();
  const feedbackRows = [];

  for (const [code, id] of Object.entries(machineIds)) {
    const profile = machineProfiles[code];
    for (let day = DAYS; day >= 0; day--) {
      const submissionsToday = 1 + Math.floor(Math.random() * 4);
      const dayMean = clamp(profile.base + profile.drift * (DAYS - day), 1, 5);
      for (let i = 0; i < submissionsToday; i++) {
        const ts = new Date(now - day * 86400000 - Math.floor(Math.random() * 86400000));
        const network = sample(dayMean, profile.volatility);
        const speed = sample(dayMean, profile.volatility);
        const cash = sample(dayMean, profile.volatility);
        const security = sample(dayMean + 0.3, profile.volatility * 0.8);
        const overall = clamp(Math.round((network + speed + cash + security) / 4), 1, 5);
        const channel = channels[Math.floor(Math.random() * channels.length)];
        const comment = comments[Math.floor(Math.random() * comments.length)];
        const contact = channel === 'web' ? null : maskLike(randomPhone());

        feedbackRows.push([
          id,
          channel,
          network,
          speed,
          cash,
          security,
          overall,
          comment,
          contact,
          ts.toISOString(),
        ]);
      }
    }
  }

  await batchInsertFeedback(feedbackRows);

  const passwordHash = bcrypt.hashSync('ChangeMe123!', 10);
  await pool.query('INSERT INTO admins (email, password_hash, name) VALUES ($1, $2, $3)', [
    'admin@gcb.example',
    passwordHash,
    'GCB Service Quality Admin',
  ]);

  console.log(
    `Seeded ${branches.length} branches, ${Object.keys(machineIds).length} machines, ${feedbackRows.length} feedback records.`
  );
  console.log('Demo admin login -> email: admin@gcb.example / password: ChangeMe123!');

  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
