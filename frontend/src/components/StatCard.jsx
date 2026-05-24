function StatCard({ label, value, note }) {
  return (
    <div className="card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

export default StatCard;