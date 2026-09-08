import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

function resolveColor(varExpr) {
  if (typeof window === 'undefined') return '#2a78d6';
  const name = varExpr.match(/--[\w-]+/)[0];
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#2a78d6';
}

export default function BranchBarChart({ branches }) {
  if (!branches || branches.length === 0) {
    return <p className="helper-text">No data yet.</p>;
  }

  const good = resolveColor('var(--status-good)');
  const warning = resolveColor('var(--status-warning)');
  const critical = resolveColor('var(--status-critical)');

  const data = branches.map((b) => ({
    name: b.name,
    overall: b.averages.overall_satisfaction ?? 0,
  }));

  function colorFor(value) {
    if (value >= 4) return good;
    if (value >= 3) return warning;
    return critical;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          axisLine={{ stroke: 'var(--baseline)' }}
          tickLine={false}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={50}
        />
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
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
          formatter={(value) => [value, 'Overall satisfaction']}
        />
        <Bar dataKey="overall" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorFor(d.overall)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
