import { Router } from 'express';
import { db, maskContact } from '../db.js';

const router = Router();

const FORMAT_HELP =
  'Format: ATM <code> <network> <speed> <cash> <security> <overall>, each rating 1-5. ' +
  'Example: ATM ATM-ACC-01 4 5 3 4 5';

// Simulates an inbound SMS to a bank shortcode, e.g.:
// "ATM ATM-ACC-01 4 5 3 4 5"
router.post('/', (req, res) => {
  const { from, text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text is required', reply: FORMAT_HELP });

  const parts = text.trim().toUpperCase().split(/\s+/);
  if (parts.length !== 7 || parts[0] !== 'ATM') {
    return res.status(400).json({ error: 'Could not parse message', reply: FORMAT_HELP });
  }

  const [, machineCode, ...ratings] = parts;
  if (!ratings.every((r) => /^[1-5]$/.test(r))) {
    return res.status(400).json({ error: 'Ratings must be 1-5', reply: FORMAT_HELP });
  }

  const machine = db.prepare('SELECT id FROM machines WHERE code = ?').get(machineCode);
  if (!machine) {
    return res.status(404).json({
      error: `Unknown machine code: ${machineCode}`,
      reply: `Sorry, we don't recognise ATM code ${machineCode}. ${FORMAT_HELP}`,
    });
  }

  const [network, speed, cash, security, overall] = ratings.map(Number);

  const info = db
    .prepare(
      `INSERT INTO feedback
        (machine_id, channel, network_reliability, transaction_speed, cash_availability, security, overall_satisfaction, comment, contact_masked)
       VALUES (?, 'sms', ?, ?, ?, ?, ?, NULL, ?)`
    )
    .run(machine.id, network, speed, cash, security, overall, maskContact(from));

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    status: 'received',
    reply: `Thank you! Your feedback for ${machineCode} has been recorded.`,
  });
});

export default router;
