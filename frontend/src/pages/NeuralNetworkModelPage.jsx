import ProgressBar from "../components/ProgressBar";
import StatCard from "../components/StatCard";

const cards = [
  {
    label: "Algorithm",
    value: "Neural Network",
    note: "Placeholder model page",
  },
  {
    label: "Status",
    value: "Pending",
    note: "Waiting for final validation",
  },
  {
    label: "Backend",
    value: "Not linked",
    note: "No API connection yet",
  },
  {
    label: "Next Step",
    value: "Review",
    note: "Connect after algorithm is finalized",
  },
];

const plannedMetrics = [
  { label: "Accuracy", value: 0 },
  { label: "Precision", value: 0 },
  { label: "Recall", value: 0 },
  { label: "F1 Score", value: 0 },
];

const plannedFeatures = [
  "price_usd",
  "weight_kg",
  "volume_m3",
  "density_kg_m3",
  "value_per_kg",
  "value_per_m3",
  "tax",
  "tax_ratio",
];

function NeuralNetworkModelPage() {
  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Neural Network Dashboard</h1>
          <p>
            Placeholder page for the Neural Network model. This page is not
            connected to backend data yet and can be linked once the algorithm
            is finalized.
          </p>
        </div>

        <div className="status-pill">Placeholder</div>
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

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Planned Model Metrics</h3>
              <p>
                These metric placeholders will be replaced with backend values
                after the Neural Network model is approved.
              </p>
            </div>
          </div>

          <div className="metric-chart">
            {plannedMetrics.map((metric) => (
              <ProgressBar
                key={metric.label}
                label={metric.label}
                value={metric.value}
              />
            ))}
          </div>
        </div>

        <div className="panel insight-panel">
          <div className="panel-header">
            <div>
              <h3>Placeholder Interpretation</h3>
              <p>Current role of this page in the interface.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Temporary page</span>
            <strong>Not connected</strong>
            <p>
              This page is prepared only as a visual placeholder. It does not
              read from the backend and should not be presented as a completed
              model until the Neural Network algorithm is validated.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Planned Workflow</h3>
              <p>How this model page can be completed later.</p>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Train Model</span>
            <i />
            <span>Validate Metrics</span>
            <i />
            <span>Add Backend API</span>
            <i />
            <span>Connect Page</span>
          </div>

          <div className="model-notes">
            <p>
              Once the final Neural Network metrics are approved, this page can
              be updated to fetch live results from the backend, similar to KNN
              and Logistic Regression.
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Future Confusion Matrix</h3>
              <p>
                This section is reserved for the final Neural Network confusion
                matrix.
              </p>
            </div>
          </div>

          <div className="confusion-matrix">
            <div className="matrix-corner" />
            <div className="matrix-axis">Predicted Low</div>
            <div className="matrix-axis">Predicted High</div>

            <div className="matrix-axis">Actual Low</div>
            <div className="matrix-cell warning">
              <strong>—</strong>
              <span>Pending</span>
            </div>
            <div className="matrix-cell warning">
              <strong>—</strong>
              <span>Pending</span>
            </div>

            <div className="matrix-axis">Actual High</div>
            <div className="matrix-cell warning">
              <strong>—</strong>
              <span>Pending</span>
            </div>
            <div className="matrix-cell warning">
              <strong>—</strong>
              <span>Pending</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Potential Features</h3>
            <p>
              Candidate input features that may be used once the Neural Network
              model is finalized.
            </p>
          </div>
        </div>

        <div className="feature-chip-grid">
          {plannedFeatures.map((feature) => (
            <span className="feature-chip" key={feature}>
              {feature.replaceAll("_", " ")}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Decision Note</h3>
            <p>What to do with this page later.</p>
          </div>
        </div>

        <div className="highlight-insight">
          <span>Flexible implementation</span>
          <strong>Keep or remove</strong>
          <p>
            If the Neural Network model is accepted, this page can be connected
            to the backend. If the model is not included in the final version,
            this page can simply be removed from the route and sidebar.
          </p>
        </div>
      </section>
    </div>
  );
}

export default NeuralNetworkModelPage;