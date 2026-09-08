import { Router } from 'express';
import { query } from '../db.js';
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

// Postgres returns COUNT(*)/bigint as a string (to avoid precision loss) and
// AVG(...)/numeric as a string too, so every aggregate is coerced explicitly
// before it goes into a JSON response.
function toNumberOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
}

function roundedAverages(row) {
  return Object.fromEntries(
    METRICS.map((m) => {
      const raw = toNumberOrNull(row[`avg_${m}`]);
      return [m, raw === null ? null : Number(raw.toFixed(2))];
    })
  );
}

function buildFilter({ branchId, machineId, from, to }) {
  const clauses = [];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (machineId) {
    clauses.push(`f.machine_id = ${add(machineId)}`);
  } else if (branchId) {
    clauses.push(`m.branch_id = ${add(branchId)}`);
  }
  if (from) clauses.push(`f.created_at >= ${add(from)}`);
  if (to) clauses.push(`f.created_at <= ${add(to)}`);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

// Overall KPI card values + channel mix for the current filter.
router.get('/summary', async (req, res, next) => {
  try {
    const { where, params } = buildFilter(req.query);
    const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');

    const { rows } = await query(
      `SELECT COUNT(*) AS total, ${avgSelect}
       FROM feedback f JOIN machines m ON m.id = f.machine_id
       ${where}`,
      params
    );
    const summary = rows[0];

    const { rows: channelRows } = await query(
      `SELECT f.channel, COUNT(*) AS count
       FROM feedback f JOIN machines m ON m.id = f.machine_id
       ${where}
       GROUP BY f.channel`,
      params
    );

    res.json({
      total: toNumberOrNull(summary.total),
      averages: roundedAverages(summary),
      channelMix: Object.fromEntries(channelRows.map((r) => [r.channel, Number(r.count)])),
    });
  } catch (err) {
    next(err);
  }
});

// Time-bucketed averages, for the trend line chart.
router.get('/trends', async (req, res, next) => {
  try {
    const { interval = 'day' } = req.query;
    const { where, params } = buildFilter(req.query);
    const bucketExpr =
      interval === 'week'
        ? `to_char(f.created_at, 'IYYY-"W"IW')`
        : interval === 'month'
        ? `to_char(f.created_at, 'YYYY-MM')`
        : `to_char(f.created_at, 'YYYY-MM-DD')`;

    const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
    const { rows } = await query(
      `SELECT ${bucketExpr} AS bucket, COUNT(*) AS count, ${avgSelect}
       FROM feedback f JOIN machines m ON m.id = f.machine_id
       ${where}
       GROUP BY bucket
       ORDER BY bucket ASC`,
      params
    );

    res.json(
      rows.map((r) => ({
        bucket: r.bucket,
        count: Number(r.count),
        ...roundedAverages(r),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// Per-branch comparison table.
router.get('/branches', async (req, res, next) => {
  try {
    const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
    const { rows } = await query(
      `SELECT b.id, b.name, b.region, COUNT(f.id) AS total, ${avgSelect}
       FROM branches b
       LEFT JOIN machines m ON m.branch_id = b.id
       LEFT JOIN feedback f ON f.machine_id = m.id
       GROUP BY b.id
       ORDER BY b.name`
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        region: r.region,
        total: Number(r.total),
        averages: roundedAverages(r),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// Per-machine comparison table, used for the "worst performing ATMs" view.
router.get('/machines', async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const avgSelect = METRICS.map((m) => `AVG(f.${m}) AS avg_${m}`).join(', ');
    const clause = branchId ? 'WHERE m.branch_id = $1' : '';
    const params = branchId ? [branchId] : [];

    const { rows } = await query(
      `SELECT m.id, m.code, b.name AS branch_name, COUNT(f.id) AS total, ${avgSelect}
       FROM machines m
       JOIN branches b ON b.id = m.branch_id
       LEFT JOIN feedback f ON f.machine_id = m.id
       ${clause}
       GROUP BY m.id, b.name
       ORDER BY b.name, m.code`,
      params
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        branchName: r.branch_name,
        total: Number(r.total),
        averages: roundedAverages(r),
      }))
    );
  } catch (err) {
    next(err);
  }
});

// Machines whose recent (last `days`) average overall satisfaction is at or
// below `threshold` — the "recurring issues" surfaced for management action.
router.get('/alerts', async (req, res, next) => {
  try {
    const days = Number(req.query.days) > 0 ? Number(req.query.days) : 7;
    const threshold = Number(req.query.threshold) > 0 ? Number(req.query.threshold) : 3;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { rows } = await query(
      `SELECT m.id, m.code, b.name AS branch_name, COUNT(f.id) AS total,
              AVG(f.overall_satisfaction) AS avg_overall,
              AVG(f.network_reliability) AS avg_network,
              AVG(f.transaction_speed) AS avg_speed,
              AVG(f.cash_availability) AS avg_cash,
              AVG(f.security) AS avg_security
       FROM machines m
       JOIN branches b ON b.id = m.branch_id
       JOIN feedback f ON f.machine_id = m.id
       WHERE f.created_at >= $1
       GROUP BY m.id, b.name
       HAVING COUNT(f.id) >= 3 AND AVG(f.overall_satisfaction) <= $2
       ORDER BY avg_overall ASC`,
      [since, threshold]
    );

    res.json(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        branchName: r.branch_name,
        total: Number(r.total),
        avgOverall: Number(Number(r.avg_overall).toFixed(2)),
        avgNetwork: Number(Number(r.avg_network).toFixed(2)),
        avgSpeed: Number(Number(r.avg_speed).toFixed(2)),
        avgCash: Number(Number(r.avg_cash).toFixed(2)),
        avgSecurity: Number(Number(r.avg_security).toFixed(2)),
        windowDays: days,
      }))
    );
  } catch (err) {
    next(err);
  }
});

// Most recent feedback entries, for a live activity feed.
router.get('/recent', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { rows } = await query(
      `SELECT f.id, f.channel, f.overall_satisfaction, f.comment, f.created_at,
              m.code AS machine_code, b.name AS branch_name
       FROM feedback f
       JOIN machines m ON m.id = f.machine_id
       JOIN branches b ON b.id = m.branch_id
       ORDER BY f.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
