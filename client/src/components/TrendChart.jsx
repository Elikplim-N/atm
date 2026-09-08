import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const SERIES = [
  { key: 'network_reliability', label: 'Network reliability', color: 'var(--series-1)' },
  { key: 'transaction_speed', label: 'Transaction speed', color: 'var(--series-2)' },
  { key: 'cash_availability', label: 'Cash availability', color: 'var(--series-3)' },
  { key: 'security', label: 'Security', color: 'var(--series-4)' },
  { key: 'overall_satisfaction', label: 'Overall satisfaction', color: 'var(--series-5)' },
];

// Recharts reads plain color strings, not CSS custom properties, so resolve
// the --series-N variables against the document once at render time.
function resolveColor(varExpr) {
  if (typeof window === 'undefined') return '#2a78d6';
  const name = varExpr.match(/--[\w-]+/)[0];
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2a78d6';
}

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="helper-text">No feedback in this range yet.</p>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={{ stroke: 'var(--baseline)' }}
            tickLine={false}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={resolveColor(s.color)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="legend-row">
        {SERIES.map((s) => (
          <span key={s.key}>
            <span className="dot" style={{ background: resolveColor(s.color) }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
