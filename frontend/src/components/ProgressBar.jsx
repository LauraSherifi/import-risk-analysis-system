import PropTypes from "prop-types";

function ProgressBar({ label, value, variant = "model" }) {
  return (
    <div className="metric-row">
      <div className="metric-title">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>

      <div className="bar-track">
        <div
          className={`bar-fill ${variant === "model" ? "model-score" : ""}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

ProgressBar.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  variant: PropTypes.string,
};

export default ProgressBar;
