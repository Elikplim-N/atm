import bcrypt from 'bcryptjs';
import { db } from './db.js';

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
  // Simple triangular-ish noise, rounded to 1-5.
  const noise = (Math.random() + Math.random() + Math.random() - 1.5) * volatility;
  return clamp(Math.round(mean + noise), 1, 5);
}

function randomPhone() {
  return `02${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function seed() {
  const countRow = db.prepare('SELECT COUNT(*) AS c FROM branches').get();
  if (countRow.c > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  const insertBranch = db.prepare('INSERT INTO branches (name, region) VALUES (?, ?)');
  const insertMachine = db.prepare(
    'INSERT INTO machines (code, branch_id, location_note) VALUES (?, ?, ?)'
  );
  const insertFeedback = db.prepare(`
    INSERT INTO feedback
      (machine_id, channel, network_reliability, transaction_speed, cash_availability, security, overall_satisfaction, comment, contact_masked, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAdmin = db.prepare(
    'INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)'
  );

  const branchIds = {};
  for (const b of branches) {
    const info = insertBranch.run(b.name, b.region);
    branchIds[b.name] = Number(info.lastInsertRowid);
  }

  const machineIds = {};
  for (const [branchName, codes] of Object.entries(machinesByBranch)) {
    for (const code of codes) {
      const info = insertMachine.run(code, branchIds[branchName], `${branchName} branch premises`);
      machineIds[code] = Number(info.lastInsertRowid);
    }
  }

  const DAYS = 60;
  const now = Date.now();
  let total = 0;

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
        const overall = clamp(
          Math.round((network + speed + cash + security) / 4),
          1,
          5
        );
        const channel = channels[Math.floor(Math.random() * channels.length)];
        const comment = comments[Math.floor(Math.random() * comments.length)];
        const contact = channel === 'web' ? null : maskLike(randomPhone());

        insertFeedback.run(
          id,
          channel,
          network,
          speed,
          cash,
          security,
          overall,
          comment,
          contact,
          ts.toISOString()
        );
        total++;
      }
    }
  }

  const passwordHash = bcrypt.hashSync('ChangeMe123!', 10);
  insertAdmin.run('admin@gcb.example', passwordHash, 'GCB Service Quality Admin');

  console.log(`Seeded ${branches.length} branches, ${Object.keys(machineIds).length} machines, ${total} feedback records.`);
  console.log('Demo admin login -> email: admin@gcb.example / password: ChangeMe123!');
}

function maskLike(phone) {
  return `${phone.slice(0, 2)}${'*'.repeat(phone.length - 4)}${phone.slice(-2)}`;
}

seed();
