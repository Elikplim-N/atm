import { Router } from 'express';
import { query, maskContact } from '../db.js';

const router = Router();

const PROMPTS = [
  'CON Welcome to GCB ATM Feedback.\nEnter the ATM code on your receipt (e.g. ATM-ACC-01):',
  'CON Rate network reliability (1=Poor - 5=Excellent):',
  'CON Rate transaction speed (1=Poor - 5=Excellent):',
  'CON Rate cash availability (1=Poor - 5=Excellent):',
  'CON Rate security at this ATM (1=Poor - 5=Excellent):',
  'CON Rate your overall satisfaction (1=Poor - 5=Excellent):',
];

function isRating(input) {
  return /^[1-5]$/.test((input || '').trim());
}

// Simulates a telco USSD gateway callback (Africa's Talking style): the gateway
// resends the full accumulated `text` (steps separated by "*") on every request,
// and this endpoint replies with "CON ..." to continue the session or "END ..." to close it.
router.post('/', async (req, res, next) => {
  try {
    res.type('text/plain');

    const { phoneNumber, text = '' } = req.body || {};
    const steps = text ? text.split('*') : [];
    const stepIndex = steps.length; // 0 = first prompt (machine code)

    if (stepIndex === 0) {
      return res.send(PROMPTS[0]);
    }

    const machineCode = steps[0].trim().toUpperCase();
    const { rows } = await query('SELECT id FROM machines WHERE code = $1', [machineCode]);
    const machine = rows[0];
    if (!machine) {
      return res.send(`END Sorry, "${machineCode}" is not a recognised ATM code. Please dial in again.`);
    }

    if (stepIndex < PROMPTS.length) {
      const lastInput = steps[stepIndex - 1];
      if (stepIndex > 1 && !isRating(lastInput)) {
        return res.send('END Invalid input. Please dial in again and enter a number from 1 to 5.');
      }
      return res.send(PROMPTS[stepIndex]);
    }

    // All 5 ratings collected: steps = [machineCode, network, speed, cash, security, overall]
    const [, network, speed, cash, security, overall] = steps;
    if (![network, speed, cash, security, overall].every(isRating)) {
      return res.send('END Invalid input. Please dial in again and enter a number from 1 to 5.');
    }

    await query(
      `INSERT INTO feedback
        (machine_id, channel, network_reliability, transaction_speed, cash_availability, security, overall_satisfaction, comment, contact_masked)
       VALUES ($1, 'ussd', $2, $3, $4, $5, $6, NULL, $7)`,
      [machine.id, +network, +speed, +cash, +security, +overall, maskContact(phoneNumber)]
    );

    return res.send('END Thank you! Your feedback has been recorded and helps us improve ATM service quality.');
  } catch (err) {
    next(err);
  }
});

export default router;
