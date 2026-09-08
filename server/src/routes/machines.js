import { Router } from 'express';
import QRCode from 'qrcode';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const machines = db
    .prepare(
      `SELECT m.*, b.name AS branch_name
       FROM machines m JOIN branches b ON b.id = m.branch_id
       ORDER BY b.name, m.code`
    )
    .all();
  res.json(machines);
});

router.get('/:code', (req, res) => {
  const machine = db
    .prepare(
      `SELECT m.*, b.name AS branch_name
       FROM machines m JOIN branches b ON b.id = m.branch_id
       WHERE m.code = ?`
    )
    .get(req.params.code);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });
  res.json(machine);
});

// Generates a QR code (PNG data URL) that a customer scans on the ATM receipt/
// sticker to land directly on the feedback form pre-filled for that machine.
router.get('/:code/qrcode', async (req, res) => {
  const machine = db.prepare('SELECT * FROM machines WHERE code = ?').get(req.params.code);
  if (!machine) return res.status(404).json({ error: 'Machine not found' });

  const baseUrl = process.env.PUBLIC_WEB_URL || 'http://localhost:5173';
  const feedbackUrl = `${baseUrl}/feedback?machine=${encodeURIComponent(machine.code)}`;

  try {
    const dataUrl = await QRCode.toDataURL(feedbackUrl, { margin: 1, width: 320 });
    res.json({ machine: machine.code, url: feedbackUrl, qrDataUrl: dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

export default router;
