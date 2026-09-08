import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM branches ORDER BY name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/machines', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM machines WHERE branch_id = $1 ORDER BY code', [
      req.params.id,
    ]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
