const datasetCircleStats = [
  {
    label: "Completeness",
    value: 100,
    detail: "No missing values",
    className: "circle-model",
  },
  {
    label: "Duplicate Free",
    value: 100,
    detail: "0 duplicate rows",
    className: "circle-low",
  },
  {
    label: "Feature Ready",
    value: 100,
    detail: "13 model-ready columns",
    className: "circle-benchmark",
  },
  {
    label: "High Risk",
    value: 14.9,
    detail: "39,407 high-risk records",
    className: "circle-high",
  },
];

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

const cleaningFunnel = [
  { label: "Raw records", value: "263,821", width: "100%" },
  { label: "After missing-value check", value: "263,821", width: "100%" },
  { label: "After duplicate check", value: "263,821", width: "100%" },
  { label: "Model-ready records", value: "263,821", width: "100%" },
];

const featureGroups = [
  { label: "Tax features", value: 92 },
  { label: "Value features", value: 88 },
  { label: "Dimension features", value: 82 },
  { label: "Volume features", value: 74 },
  { label: "Weight features", value: 68 },
  { label: "Density features", value: 61 },
];

const validationMatrix = [
  { check: "Missing values", result: "Passed", status: "success" },
  { check: "Duplicate rows", result: "Passed", status: "success" },
  { check: "Tax ratio fields", result: "Checked", status: "info" },
  { check: "Model input format", result: "Ready", status: "success" },
];

function DatasetPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dataset Overview</h1>
          <p>
            Visual summary of the cleaned, validated and feature-engineered
            shipment dataset used for import risk analysis.
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
          <strong>11</strong>
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

      <section className="panel dashboard-section">
        <div className="panel-header">
          <div>
            <h3>Dataset Quality Snapshot</h3>
            <p>
              Circular view of dataset completeness, duplicate status, feature
              readiness and class balance.
            </p>
          </div>
        </div>

        <div className="circle-chart-grid">
          {datasetCircleStats.map((item) => (
            <div className="circle-chart-card" key={item.label}>
              <div
                className={`circle-chart ${item.className}`}
                style={{ "--value": `${item.value}%` }}
              >
                <div className="circle-chart-inner">
                  <strong>{item.value}%</strong>
                  <span>{item.label}</span>
                </div>
              </div>

              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid dataset-grid">
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

        <div className="panel compact-panel">
  <div className="panel-header">
    <div>
      <h3>Cleaning Retention</h3>
      <p>Record retention after each data preparation step.</p>
    </div>
  </div>

  <div className="retention-summary">
    {cleaningFunnel.map((item) => (
      <div className="retention-card" key={item.label}>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
        <small>{item.retention}</small>

        <div className="retention-bar">
          <div style={{ width: item.width }} />
        </div>
      </div>
    ))}
  </div>
</div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Feature Engineering Strength</h3>
              <p>
                Visual grouping of engineered features used in the analysis.
              </p>
            </div>
          </div>

          <div className="feature-impact-list">
            {featureGroups.map((feature) => (
              <div className="metric-row" key={feature.label}>
                <div className="metric-title">
                  <span>{feature.label}</span>
                  <strong>{feature.value}%</strong>
                </div>

                <div className="bar-track">
                  <div
                    className="bar-fill model-score"
                    style={{ width: `${feature.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Validation Matrix</h3>
              <p>Final quality checks before model training and evaluation.</p>
            </div>
          </div>

        <div className="validation-scorecard">
  {validationMatrix.map((item) => (
    <div className={`validation-score-row ${item.status}`} key={item.check}>
      <div>
        <span>{item.check}</span>
        <p>Dataset check completed successfully.</p>
      </div>

      <strong>{item.result}</strong>
    </div>
  ))}
</div>
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

          <div className="mini-pipeline dataset-mini-pipeline">
            <span>Raw Data</span>
            <i />
            <span>Cleaning</span>
            <i />
            <span>Features</span>
            <i />
            <span>Validated</span>
            <i />
            <span>Model-ready</span>
          </div>

          <div className="quality-dashboard-grid dataset-readiness-grid">
            <div>
              <span>Completeness</span>
              <strong>100%</strong>
            </div>
            <div>
              <span>Duplicates</span>
              <strong>0</strong>
            </div>
            <div>
              <span>Features</span>
              <strong>13</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>Ready</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default DatasetPage;