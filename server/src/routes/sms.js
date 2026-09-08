import { Router } from 'express';
import { query, maskContact } from '../db.js';

const router = Router();

const FORMAT_HELP =
  'Format: ATM <code> <network> <speed> <cash> <security> <overall>, each rating 1-5. ' +
  'Example: ATM ATM-ACC-01 4 5 3 4 5';

// Simulates an inbound SMS to a bank shortcode, e.g.:
// "ATM ATM-ACC-01 4 5 3 4 5"
router.post('/', async (req, res, next) => {
  try {
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

    const { rows } = await query('SELECT id FROM machines WHERE code = $1', [machineCode]);
    const machine = rows[0];
    if (!machine) {
      return res.status(404).json({
        error: `Unknown machine code: ${machineCode}`,
        reply: `Sorry, we don't recognise ATM code ${machineCode}. ${FORMAT_HELP}`,
      });
    }

    const [network, speed, cash, security, overall] = ratings.map(Number);

    const insert = await query(
      `INSERT INTO feedback
        (machine_id, channel, network_reliability, transaction_speed, cash_availability, security, overall_satisfaction, comment, contact_masked)
       VALUES ($1, 'sms', $2, $3, $4, $5, $6, NULL, $7)
       RETURNING id`,
      [machine.id, network, speed, cash, security, overall, maskContact(from)]
    );

    res.status(201).json({
      id: insert.rows[0].id,
      status: 'received',
      reply: `Thank you! Your feedback for ${machineCode} has been recorded.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
