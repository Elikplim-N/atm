import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const branches = db.prepare('SELECT * FROM branches ORDER BY name').all();
  res.json(branches);
});

router.get('/:id/machines', (req, res) => {
  const machines = db
    .prepare('SELECT * FROM machines WHERE branch_id = ? ORDER BY code')
    .all(req.params.id);
  res.json(machines);
});

export default router;
