import StatCard from "../components/StatCard";
import ProgressBar from "../components/ProgressBar";

const overviewCards = [
  {
    label: "Total Records",
    value: "263,821",
    note: "Final cleaned shipment records",
  },
  {
    label: "Completed Models",
    value: "2",
    note: "KNN and Logistic Regression",
  },
  {
    label: "High Risk Share",
    value: "14.9%",
    note: "39,407 high-risk records",
  },
  {
    label: "Model-ready Features",
    value: "13",
    note: "After feature engineering",
  },
];

const riskData = [
  { label: "LOW RISK", value: 224414, percentage: 85.1 },
  { label: "HIGH RISK", value: 39407, percentage: 14.9 },
];

const circularStats = [
  {
    label: "Low Risk",
    value: 85.1,
    detail: "224,414 records",
    className: "circle-low",
  },
  {
    label: "High Risk",
    value: 14.9,
    detail: "39,407 records",
    className: "circle-high",
  },
  {
    label: "KNN Accuracy",
    value: 98.58,
    detail: "Best completed model",
    className: "circle-model",
  },
  {
    label: "Logistic Accuracy",
    value: 49.92,
    detail: "Benchmark model",
    className: "circle-benchmark",
  },
];
const confusionMatrix = [
  { actual: "LOW RISK", predicted: "LOW RISK", value: "10,131", type: "correct" },
  { actual: "LOW RISK", predicted: "HIGH RISK", value: "77", type: "error" },
  { actual: "HIGH RISK", predicted: "LOW RISK", value: "94", type: "error" },
  { actual: "HIGH RISK", predicted: "HIGH RISK", value: "1,698", type: "correct" },
];

const metricsMatrix = [
  { metric: "Accuracy", knn: "98.58%", logistic: "49.92%" },
  { metric: "F1 Score", knn: "97.18%", logistic: "22.88%" },
  { metric: "Precision", knn: "95.66%", logistic: "14.86%" },
  { metric: "Recall", knn: "94.75%", logistic: "49.75%" },
];

const completedModels = [
  {
    name: "KNN",
    role: "Best completed classifier",
    status: "Completed",
    accuracy: 98.58,
    f1: 97.18,
    precision: 95.66,
    recall: 94.75,
    insight:
      "Strongest current model with very high accuracy and balanced performance.",
  },
  {
    name: "Logistic Regression",
    role: "Interpretable benchmark model",
    status: "Completed",
    accuracy: 49.92,
    f1: 22.88,
    precision: 14.86,
    recall: 49.75,
    insight:
      "Useful as a transparent baseline, but weaker than the KNN model.",
  },
];

const featureImpact = [
  { label: "Tax ratio", value: 92 },
  { label: "Value per kg", value: 88 },
  { label: "Density", value: 76 },
  { label: "Volume", value: 68 },
  { label: "Weight", value: 61 },
];

const roadmapItems = [
  {
    model: "KNN",
    status: "Completed",
    note: "Currently strongest completed classifier.",
  },
  {
    model: "Logistic Regression",
    status: "Completed",
    note: "Benchmark model for interpretability.",
  },
  {
    model: "Decision Tree",
    status: "Upcoming",
    note: "Planned for future model comparison.",
  },
  {
    model: "Neural Network",
    status: "Upcoming",
    note: "To be shown once fully validated.",
  },
];

const sampleRows = [
  {
    product: "Camera Bag",
    price: "$37.66",
    weight: "1.10 kg",
    volume: "0.0406 m³",
    taxRatio: "0.1662",
    risk: "LOW RISK",
  },
  {
    product: "Portable Bluetooth Keyboard",
    price: "$144.65",
    weight: "0.39 kg",
    volume: "0.0002 m³",
    taxRatio: "0.1159",
    risk: "LOW RISK",
  },
  {
    product: "Large Flat Rate Box",
    price: "$38.57",
    weight: "0.97 kg",
    volume: "0.1521 m³",
    taxRatio: "0.1789",
    risk: "LOW RISK",
  },
  {
    product: "Ceramic Tiles",
    price: "$10.34",
    weight: "6.22 kg",
    volume: "0.0027 m³",
    taxRatio: "0.1547",
    risk: "LOW RISK",
  },
  {
    product: "Garden Hose",
    price: "$21.63",
    weight: "1.18 kg",
    volume: "0.6237 m³",
    taxRatio: "0.0643",
    risk: "HIGH RISK",
  },
];

function Dashboard() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Shipment Risk Dashboard</h1>
          <p>
            Executive overview of the cleaned shipment dataset, risk structure,
            completed model performance and future model roadmap.
          </p>
        </div>

        <div className="status-pill">Validated Dataset</div>
      </header>

      <section className="cards">
        {overviewCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            note={card.note}
          />
        ))}
      </section>



      <section className="panel dashboard-section">
  <div className="panel-header">
    <div>
      <h3>Performance Snapshot</h3>
      <p>
        Circular overview of risk balance and completed model performance.
      </p>
    </div>
  </div>

  <div className="circle-chart-grid">
    {circularStats.map((item) => (
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

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Risk Distribution</h3>
              <p>Share of records classified as low or high risk.</p>
            </div>
          </div>

          <div className="risk-chart">
            {riskData.map((item) => (
              <div className="risk-row" key={item.label}>
                <div className="risk-label">
                  <span>{item.label}</span>
                  <strong>{item.value.toLocaleString()}</strong>
                </div>

                <div className="bar-track">
                  <div
                    className={`bar-fill ${
                      item.label === "HIGH RISK" ? "high-risk" : "low-risk"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <small>{item.percentage}%</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel insight-panel">
          <div className="panel-header">
            <div>
              <h3>Key Model Insight</h3>
              <p>Main interpretation from completed model results.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Best Performing Model</span>
            <strong>KNN</strong>
            <p>
              KNN currently outperforms Logistic Regression across the main
              evaluation metrics. Logistic Regression remains useful as an
              interpretable benchmark while additional models are prepared.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Completed Model Comparison</h3>
            <p>
              Comparison of the models that are currently completed and visible
              in the system.
            </p>
          </div>
        </div>

        <div className="model-comparison-grid">
          {completedModels.map((model) => (
            <div className="model-card" key={model.name}>
              <div className="model-card-header">
                <div>
                  <h4>{model.name}</h4>
                  <p>{model.role}</p>
                </div>

                <span className="model-status-badge">{model.status}</span>
              </div>

              <div className="metric-chart">
                <ProgressBar label="Accuracy" value={model.accuracy} />
                <ProgressBar label="F1 Score" value={model.f1} />
                <ProgressBar label="Precision" value={model.precision} />
                <ProgressBar label="Recall" value={model.recall} />
              </div>

              <p className="model-insight">{model.insight}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid">
  <div className="panel">
    <div className="panel-header">
      <div>
        <h3>KNN Confusion Matrix</h3>
        <p>
          Model evaluation matrix showing correct and incorrect classifications.
        </p>
      </div>
    </div>

    <div className="confusion-matrix">
      <div className="matrix-corner" />
      <div className="matrix-axis">Predicted Low</div>
      <div className="matrix-axis">Predicted High</div>

      <div className="matrix-axis">Actual Low</div>
      {confusionMatrix.slice(0, 2).map((cell) => (
        <div className={`matrix-cell ${cell.type}`} key={`${cell.actual}-${cell.predicted}`}>
          <strong>{cell.value}</strong>
          <span>{cell.predicted}</span>
        </div>
      ))}

      <div className="matrix-axis">Actual High</div>
      {confusionMatrix.slice(2, 4).map((cell) => (
        <div className={`matrix-cell ${cell.type}`} key={`${cell.actual}-${cell.predicted}`}>
          <strong>{cell.value}</strong>
          <span>{cell.predicted}</span>
        </div>
      ))}
    </div>
  </div>

  <div className="panel">
    <div className="panel-header">
      <div>
        <h3>Model Metrics Matrix</h3>
        <p>
          Side-by-side comparison of completed model results.
        </p>
      </div>
    </div>

    <div className="metrics-heatmap">
      <div className="heatmap-row heatmap-header">
        <span>Metric</span>
        <strong>KNN</strong>
        <strong>Logistic</strong>
      </div>

      {metricsMatrix.map((row) => (
        <div className="heatmap-row" key={row.metric}>
          <span>{row.metric}</span>
          <strong className="heatmap-strong">{row.knn}</strong>
          <strong className="heatmap-weak">{row.logistic}</strong>
        </div>
      ))}
    </div>
  </div>
</section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Feature Impact Overview</h3>
              <p>Visual overview of strongest feature groups used in analysis.</p>
            </div>
          </div>

          <div className="feature-impact-list">
            {featureImpact.map((feature) => (
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
              <h3>Data Quality Snapshot</h3>
              <p>Final dataset readiness before model evaluation.</p>
            </div>
          </div>

          <div className="quality-dashboard-grid">
            <div>
              <span>Missing Values</span>
              <strong>0</strong>
            </div>
            <div>
              <span>Duplicate Rows</span>
              <strong>0</strong>
            </div>
            <div>
              <span>Validation</span>
              <strong>Passed</strong>
            </div>
            <div>
              <span>Feature Set</span>
              <strong>Ready</strong>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Raw Data</span>
            <i />
            <span>Cleaning</span>
            <i />
            <span>Features</span>
            <i />
            <span>Validated</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Model Roadmap</h3>
            <p>
              Completed models are visible in the sidebar, while upcoming models
              remain hidden until validation is finished.
            </p>
          </div>
        </div>

        <div className="roadmap-grid">
          {roadmapItems.map((item) => (
            <div
              className={`roadmap-card ${
                item.status === "Completed" ? "roadmap-ready" : "roadmap-next"
              }`}
              key={item.model}
            >
              <span>{item.status}</span>
              <strong>{item.model}</strong>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <h3>Dataset Sample</h3>
            <p>Example records from the final feature-engineered dataset.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Weight</th>
                <th>Volume</th>
                <th>Tax Ratio</th>
                <th>Risk</th>
              </tr>
            </thead>

            <tbody>
              {sampleRows.map((row) => (
                <tr key={`${row.product}-${row.taxRatio}`}>
                  <td>{row.product}</td>
                  <td>{row.price}</td>
                  <td>{row.weight}</td>
                  <td>{row.volume}</td>
                  <td>{row.taxRatio}</td>
                  <td>
                    <span
                      className={`risk-badge ${
                        row.risk === "HIGH RISK" ? "badge-high" : "badge-low"
                      }`}
                    >
                      {row.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default Dashboard;