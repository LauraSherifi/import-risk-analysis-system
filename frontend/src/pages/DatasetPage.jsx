const cleaningSteps = [
  {
    title: "Raw Import Data",
    description: "Initial shipment records before validation and preparation.",
  },
  {
    title: "Data Cleaning",
    description: "Missing values, duplicate rows and invalid entries checked.",
  },
  {
    title: "Feature Engineering",
    description: "Tax ratio, density, volume and value-based variables created.",
  },
  {
    title: "Final Validation",
    description: "Dataset checked and prepared for model training and evaluation.",
  },
];

const featureGroups = [
  "Price features",
  "Weight features",
  "Dimension features",
  "Volume features",
  "Density features",
  "Tax features",
  "Risk labels",
];

function DatasetPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dataset Overview</h1>
          <p>
            Summary of the cleaned, validated and feature-engineered shipment
            dataset used for import risk analysis.
          </p>
        </div>

        <div className="status-pill">Validated Dataset</div>
      </header>

      <section className="cards">
        <div className="card">
          <span>Total Records</span>
          <strong>263,821</strong>
          <p>Final cleaned dataset</p>
        </div>

        <div className="card">
          <span>Dataset Columns</span>
          <strong>17</strong>
          <p>After feature engineering</p>
        </div>

        <div className="card">
          <span>Missing Values</span>
          <strong>0</strong>
          <p>Validated final dataset</p>
        </div>

        <div className="card">
          <span>Duplicate Rows</span>
          <strong>0</strong>
          <p>No duplicate rows found</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Data Cleaning Pipeline</h3>
              <p>How raw shipment data becomes model-ready data.</p>
            </div>
          </div>

          <div className="pipeline">
            {cleaningSteps.map((step, index) => (
              <div className="pipeline-step" key={step.title}>
                <div className="pipeline-number">{index + 1}</div>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Data Quality Checks</h3>
              <p>Validation indicators for the final dataset.</p>
            </div>
          </div>

          <div className="quality-list">
            <div className="quality-row">
              <span>Missing value treatment</span>
              <strong>Passed</strong>
            </div>

            <div className="quality-row">
              <span>Duplicate row check</span>
              <strong>Passed</strong>
            </div>

            <div className="quality-row">
              <span>Feature consistency</span>
              <strong>Passed</strong>
            </div>

            <div className="quality-row">
              <span>Model-ready structure</span>
              <strong>Passed</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Feature Engineering Overview</h3>
            <p>
              Engineered variables expand the raw shipment data into stronger
              analytical inputs for model training.
            </p>
          </div>
        </div>

        <div className="feature-chip-grid">
          {featureGroups.map((feature) => (
            <div className="feature-chip" key={feature}>
              {feature}
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Risk Label Balance</h3>
              <p>Class distribution used to understand risk imbalance.</p>
            </div>
          </div>

          <div className="risk-chart">
            <div className="risk-row">
              <div className="risk-label">
                <span>LOW RISK</span>
                <strong>224,414</strong>
              </div>

              <div className="bar-track">
                <div className="bar-fill low-risk" style={{ width: "85.1%" }} />
              </div>

              <small>85.1%</small>
            </div>

            <div className="risk-row">
              <div className="risk-label">
                <span>HIGH RISK</span>
                <strong>39,407</strong>
              </div>

              <div className="bar-track">
                <div className="bar-fill high-risk" style={{ width: "14.9%" }} />
              </div>

              <small>14.9%</small>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Model Input Readiness</h3>
              <p>Final dataset preparation status before model evaluation.</p>
            </div>
          </div>

          <div className="metric-chart">
            <div className="metric-row">
              <div className="metric-title">
                <span>Data completeness</span>
                <strong>100%</strong>
              </div>

              <div className="bar-track">
                <div className="bar-fill model-score" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-title">
                <span>Duplicate removal</span>
                <strong>100%</strong>
              </div>

              <div className="bar-track">
                <div className="bar-fill model-score" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-title">
                <span>Feature engineering</span>
                <strong>Ready</strong>
              </div>

              <div className="bar-track">
                <div className="bar-fill model-score" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default DatasetPage;