import PropTypes from "prop-types";

function StatCard({ label, value, note }) {
  return (
    <div className="card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </div>
  );
}

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  note: PropTypes.string.isRequired,
};

export default StatCard;
