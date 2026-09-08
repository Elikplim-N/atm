import { useEffect, useMemo, useState } from 'react';
import api from '../api.js';
import StatCard from '../components/StatCard.jsx';
import TrendChart from '../components/TrendChart.jsx';
import BranchBarChart from '../components/BranchBarChart.jsx';
import AlertsTable from '../components/AlertsTable.jsx';

const RANGE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time', days: null },
];

const METRIC_LABELS = {
  network_reliability: 'Network reliability',
  transaction_speed: 'Transaction speed',
  cash_availability: 'Cash availability',
  security: 'Security',
  overall_satisfaction: 'Overall satisfaction',
};

export default function Dashboard() {
  const [branches, setBranches] = useState([]);
  const [machines, setMachines] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [rangeDays, setRangeDays] = useState(30);
  const [granularity, setGranularity] = useState('day');

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [branchStats, setBranchStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const from = useMemo(() => {
    if (!rangeDays) return null;
    return new Date(Date.now() - rangeDays * 86400000).toISOString();
  }, [rangeDays]);

  useEffect(() => {
    api.get('/branches').then(({ data }) => setBranches(data));
  }, []);

  useEffect(() => {
    setMachineId('');
    if (!branchId) {
      setMachines([]);
      return;
    }
    api.get(`/branches/${branchId}/machines`).then(({ data }) => setMachines(data));
  }, [branchId]);

  useEffect(() => {
    const params = {};
    if (branchId) params.branchId = branchId;
    if (machineId) params.machineId = machineId;
    if (from) params.from = from;

    setLoading(true);
    Promise.all([
      api.get('/dashboard/summary', { params }),
      api.get('/dashboard/trends', { params: { ...params, interval: granularity } }),
      api.get('/dashboard/branches'),
      api.get('/dashboard/alerts'),
      api.get('/dashboard/recent', { params: { limit: 15 } }),
    ])
      .then(([s, t, b, a, r]) => {
        setSummary(s.data);
        setTrends(t.data);
        setBranchStats(b.data);
        setAlerts(a.data);
        setRecent(r.data);
      })
      .finally(() => setLoading(false));
  }, [branchId, machineId, from, granularity]);

  return (
    <div>
      <div className="filters-bar">
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select value={machineId} onChange={(e) => setMachineId(e.target.value)} disabled={!branchId}>
          <option value="">All ATMs in branch</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code}
            </option>
          ))}
        </select>

        <select value={rangeDays ?? ''} onChange={(e) => setRangeDays(e.target.value ? Number(e.target.value) : null)}>
          {RANGE_OPTIONS.map((r) => (
            <option key={r.label} value={r.days ?? ''}>
              {r.label}
            </option>
          ))}
        </select>

        <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
      </div>

      {loading && !summary ? (
        <p className="helper-text">Loading dashboard…</p>
      ) : (
        <>
          <div className="grid stats">
            <StatCard label="Feedback received" value={summary.total} />
            {Object.entries(summary.averages).map(([key, value]) => (
              <StatCard
                key={key}
                label={METRIC_LABELS[key]}
                value={value !== null ? `${value.toFixed(1)} / 5` : '—'}
                small
              />
            ))}
          </div>

          <div className="card">
            <h3 className="section-title">Service quality trend</h3>
            <TrendChart data={trends} />
          </div>

          <div className="two-col">
            <div className="card">
              <h3 className="section-title">Overall satisfaction by branch</h3>
              <BranchBarChart branches={branchStats} />
            </div>

            <div className="card">
              <h3 className="section-title">Recent feedback</h3>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>ATM</th>
                      <th>Channel</th>
                      <th>Overall</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <td>{r.machine_code}</td>
                        <td>
                          <span className="badge channel">{r.channel}</span>
                        </td>
                        <td>{r.overall_satisfaction}</td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">ATMs needing attention (last 7 days, avg ≤ 3)</h3>
            <AlertsTable alerts={alerts} />
          </div>
        </>
      )}
    </div>
  );
}
