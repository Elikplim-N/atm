import { Router } from 'express';
import QRCode from 'qrcode';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT m.*, b.name AS branch_name
       FROM machines m JOIN branches b ON b.id = m.branch_id
       ORDER BY b.name, m.code`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT m.*, b.name AS branch_name
       FROM machines m JOIN branches b ON b.id = m.branch_id
       WHERE m.code = $1`,
      [req.params.code]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Machine not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Generates a QR code (PNG data URL) that a customer scans on the ATM receipt/
// sticker to land directly on the feedback form pre-filled for that machine.
router.get('/:code/qrcode', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM machines WHERE code = $1', [req.params.code]);
    const machine = rows[0];
    if (!machine) return res.status(404).json({ error: 'Machine not found' });

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const requestOrigin = host ? `${proto}://${host}` : null;
    const baseUrl = process.env.PUBLIC_WEB_URL || requestOrigin || 'http://localhost:5173';
    const feedbackUrl = `${baseUrl}/feedback?machine=${encodeURIComponent(machine.code)}`;

    const dataUrl = await QRCode.toDataURL(feedbackUrl, { margin: 1, width: 320 });
    res.json({ machine: machine.code, url: feedbackUrl, qrDataUrl: dataUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
