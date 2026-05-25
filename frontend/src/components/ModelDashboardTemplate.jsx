import PropTypes from "prop-types";

import ProgressBar from "./ProgressBar";
import StatCard from "./StatCard";

function ModelDashboardTemplate({
  title,
  subtitle,
  status,
  cards,
  metrics,
  notes,
}) {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="status-pill">{status}</div>
      </header>

      <section className="cards">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            note={card.note}
          />
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Model Performance</h3>
            <p>Evaluation metrics for the completed classifier.</p>
          </div>
        </div>

        <div className="metric-chart">
          {metrics.map((metric) => (
            <ProgressBar
              key={metric.label}
              label={metric.label}
              value={metric.value}
              variant="model"
            />
          ))}
        </div>
      </section>

      {notes && (
        <section className="panel model-notes">
          <div className="panel-header">
            <div>
              <h3>Model Notes</h3>
              <p>{notes}</p>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

ModelDashboardTemplate.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      note: PropTypes.string.isRequired,
    })
  ).isRequired,
  metrics: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ).isRequired,
  notes: PropTypes.string,
};

export default ModelDashboardTemplate;
