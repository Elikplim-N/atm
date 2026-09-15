import { Router } from 'express';
import { waitUntil } from '@vercel/functions';
import { query, maskContact } from '../db.js';
import { sendSms } from '../services/arkesel.js';
import { getRequestOrigin } from '../utils/http.js';

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
router.post('/', async (req, res, next) => {
  try {
    const { machine, comment, contact } = req.body || {};
    if (!machine) return res.status(400).json({ error: 'machine (ATM code) is required' });

    const err = validateRatings(req.body || {});
    if (err) return res.status(400).json({ error: err });

    const { rows } = await query('SELECT id FROM machines WHERE code = $1', [machine]);
    const machineRow = rows[0];
    if (!machineRow) return res.status(404).json({ error: `Unknown machine code: ${machine}` });

    const insert = await query(
      `INSERT INTO feedback
        (machine_id, channel, network_reliability, transaction_speed, cash_availability, security, overall_satisfaction, comment, contact_masked)
       VALUES ($1, 'web', $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        machineRow.id,
        req.body.network_reliability,
        req.body.transaction_speed,
        req.body.cash_availability,
        req.body.security,
        req.body.overall_satisfaction,
        comment || null,
        maskContact(contact),
      ]
    );

    if (contact) {
      const origin = getRequestOrigin(req);
      const callbackUrl = origin ? `${origin}/api/sms/delivery-callback` : undefined;
      // Sent in the background so the response doesn't wait on Arkesel's API —
      // waitUntil keeps the function alive to finish it after the response is sent.
      waitUntil(
        sendSms(
          contact,
          `Thank you for rating ${machine.trim().toUpperCase()}! Your feedback helps us improve ATM service quality. - GCB`,
          callbackUrl
        )
      );
    }

    res.status(201).json({ id: insert.rows[0].id, status: 'received' });
  } catch (err) {
    next(err);
  }
});

export default router;
