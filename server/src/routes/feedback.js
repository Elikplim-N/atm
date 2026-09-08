import { Router } from 'express';
import { db, maskContact } from '../db.js';

const router = Router();

const RATING_FIELDS = [
  'network_reliability',
  'transaction_speed',
  'cash_availability',
  'security',
  'overall_satisfaction',
];

function validateRatings(body) {
  for (const field of RATING_FIELDS) {
    const value = Number(body[field]);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return `${field} must be an integer between 1 and 5`;
    }
  }
  return null;
}

// Public endpoint used by the QR-code-linked web form immediately after a transaction.
router.post('/', (req, res) => {
  const { machine, comment, contact } = req.body || {};
  if (!machine) return res.status(400).json({ error: 'machine (ATM code) is required' });

  const err = validateRatings(req.body || {});
  if (err) return res.status(400).json({ error: err });

  const machineRow = db.prepare('SELECT id FROM machines WHERE code = ?').get(machine);
  if (!machineRow) return res.status(404).json({ error: `Unknown machine code: ${machine}` });

  const info = db
    .prepare(
      `INSERT INTO feedback
        (machine_id, channel, network_reliability, transaction_speed, cash_availability, security, overall_satisfaction, comment, contact_masked)
       VALUES (?, 'web', ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      machineRow.id,
      req.body.network_reliability,
      req.body.transaction_speed,
      req.body.cash_availability,
      req.body.security,
      req.body.overall_satisfaction,
      comment || null,
      maskContact(contact)
    );

  res.status(201).json({ id: Number(info.lastInsertRowid), status: 'received' });
});

export default router;
