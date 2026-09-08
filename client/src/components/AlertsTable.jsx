function badgeClass(avg) {
  if (avg <= 2) return 'critical';
  return 'warning';
}

export default function AlertsTable({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return <p className="helper-text">No ATMs below the alert threshold in this window.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>ATM</th>
            <th>Branch</th>
            <th>Feedback</th>
            <th>Overall</th>
            <th>Network</th>
            <th>Speed</th>
            <th>Cash</th>
            <th>Security</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id}>
              <td>{a.code}</td>
              <td>{a.branchName}</td>
              <td>{a.total}</td>
              <td>
                <span className={`badge ${badgeClass(a.avgOverall)}`}>{a.avgOverall.toFixed(1)}</span>
              </td>
              <td>{a.avgNetwork.toFixed(1)}</td>
              <td>{a.avgSpeed.toFixed(1)}</td>
              <td>{a.avgCash.toFixed(1)}</td>
              <td>{a.avgSecurity.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
