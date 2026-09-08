export default function StatCard({ label, value, small }) {
  return (
    <div className="card stat-tile">
      <div className="label">{label}</div>
      <div className={`value ${small ? 'small' : ''}`}>{value}</div>
    </div>
  );
}
