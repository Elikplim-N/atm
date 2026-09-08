import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const METRICS = [
  'network_reliability',
  'transaction_speed',
  'cash_availability',
  'security',
  'overall_satisfaction',
];

function buildFilter({ branchId, machineId, from, to }) {
  const clauses = [];
  const params = [];

  if (machineId) {
    clauses.push('f.machine_id = ?');
    params.push(machineId);
  } else if (branchId) {
    clauses.push('m.branch_id = ?');
    params.push(branchId);
  }
  if (from) {
    clauses.push('f.created_at >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('f.created_at <= ?');
    params.push(to);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

// Overall KPI card values + channel mix for the current filter.
router.get('/summary', (req, res) => {
  const { where, params } = buildFilter(req.query);

  const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
  const summary = db
    .prepare(
      `SELECT COUNT(*) AS total, ${avgSelect}
       FROM feedback f JOIN machines m ON m.id = f.machine_id
       ${where}`
    )
    .get(...params);

  const channelRows = db
    .prepare(
      `SELECT f.channel, COUNT(*) AS count
       FROM feedback f JOIN machines m ON m.id = f.machine_id
       ${where}
       GROUP BY f.channel`
    )
    .all(...params);

  res.json({
    total: summary.total,
    averages: Object.fromEntries(
      METRICS.map((m) => [m, summary[`avg_${m}`] ? Number(summary[`avg_${m}`].toFixed(2)) : null])
    ),
    channelMix: Object.fromEntries(channelRows.map((r) => [r.channel, r.count])),
  });
});

// Time-bucketed averages, for the trend line chart.
router.get('/trends', (req, res) => {
  const { interval = 'day' } = req.query;
  const { where, params } = buildFilter(req.query);
  const bucketExpr =
    interval === 'week'
      ? "strftime('%Y-W%W', f.created_at)"
      : interval === 'month'
      ? "strftime('%Y-%m', f.created_at)"
      : "strftime('%Y-%m-%d', f.created_at)";

  const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
  const rows = db
    .prepare(
      `SELECT ${bucketExpr} AS bucket, COUNT(*) AS count, ${avgSelect}
       FROM feedback f JOIN machines m ON m.id = f.machine_id
       ${where}
       GROUP BY bucket
       ORDER BY bucket ASC`
    )
    .all(...params);

  res.json(
    rows.map((r) => ({
      bucket: r.bucket,
      count: r.count,
      ...Object.fromEntries(METRICS.map((m) => [m, Number(r[`avg_${m}`].toFixed(2))])),
    }))
  );
});

// Per-branch comparison table.
router.get('/branches', (req, res) => {
  const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
  const rows = db
    .prepare(
      `SELECT b.id, b.name, b.region, COUNT(f.id) AS total, ${avgSelect}
       FROM branches b
       LEFT JOIN machines m ON m.branch_id = b.id
       LEFT JOIN feedback f ON f.machine_id = m.id
       GROUP BY b.id
       ORDER BY b.name`
    )
    .all();

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      total: r.total,
      averages: Object.fromEntries(
        METRICS.map((m) => [m, r[`avg_${m}`] ? Number(r[`avg_${m}`].toFixed(2)) : null])
      ),
    }))
  );
});

// Per-machine comparison table, used for the "worst performing ATMs" view.
router.get('/machines', (req, res) => {
  const { branchId } = req.query;
  const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
  const clause = branchId ? 'WHERE m.branch_id = ?' : '';
  const params = branchId ? [branchId] : [];

  const rows = db
    .prepare(
      `SELECT m.id, m.code, b.name AS branch_name, COUNT(f.id) AS total, ${avgSelect}
       FROM machines m
       JOIN branches b ON b.id = m.branch_id
       LEFT JOIN feedback f ON f.machine_id = m.id
       ${clause}
       GROUP BY m.id
       ORDER BY b.name, m.code`
    )
    .all(...params);

  res.json(
    rows.map((r) => ({
      id: r.id,
      code: r.code,
      branchName: r.branch_name,
      total: r.total,
      averages: Object.fromEntries(
        METRICS.map((m) => [m, r[`avg_${m}`] ? Number(r[`avg_${m}`].toFixed(2)) : null])
      ),
    }))
  );
});

// Machines whose recent (last `days`) average overall satisfaction is at or
// below `threshold` — the "recurring issues" surfaced for management action.
router.get('/alerts', (req, res) => {
  const days = Number(req.query.days) > 0 ? Number(req.query.days) : 7;
  const threshold = Number(req.query.threshold) > 0 ? Number(req.query.threshold) : 3;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const rows = db
    .prepare(
      `SELECT m.id, m.code, b.name AS branch_name, COUNT(f.id) AS total,
              AVG(f.overall_satisfaction) AS avg_overall,
              AVG(f.network_reliability) AS avg_network,
              AVG(f.transaction_speed) AS avg_speed,
              AVG(f.cash_availability) AS avg_cash,
              AVG(f.security) AS avg_security
       FROM machines m
       JOIN branches b ON b.id = m.branch_id
       JOIN feedback f ON f.machine_id = m.id
       WHERE f.created_at >= ?
       GROUP BY m.id
       HAVING total >= 3 AND avg_overall <= ?
       ORDER BY avg_overall ASC`
    )
    .all(since, threshold);

  res.json(
    rows.map((r) => ({
      id: r.id,
      code: r.code,
      branchName: r.branch_name,
      total: r.total,
      avgOverall: Number(r.avg_overall.toFixed(2)),
      avgNetwork: Number(r.avg_network.toFixed(2)),
      avgSpeed: Number(r.avg_speed.toFixed(2)),
      avgCash: Number(r.avg_cash.toFixed(2)),
      avgSecurity: Number(r.avg_security.toFixed(2)),
      windowDays: days,
    }))
  );
});

// Most recent feedback entries, for a live activity feed.
router.get('/recent', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db
    .prepare(
      `SELECT f.id, f.channel, f.overall_satisfaction, f.comment, f.created_at,
              m.code AS machine_code, b.name AS branch_name
       FROM feedback f
       JOIN machines m ON m.id = f.machine_id
       JOIN branches b ON b.id = m.branch_id
       ORDER BY f.created_at DESC
       LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

export default router;
