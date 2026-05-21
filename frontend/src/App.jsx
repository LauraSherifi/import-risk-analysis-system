import "./App.css";

const overviewCards = [
  { label: "Total Records", value: "263,821", note: "Final cleaned dataset" },
  { label: "Dataset Columns", value: "17", note: "After feature engineering" },
  { label: "Missing Values", value: "0", note: "Validated final dataset" },
  { label: "Duplicate Rows", value: "0", note: "No duplicates found" },
];

const riskData = [
  { label: "LOW RISK", value: 224414, percentage: 85.1 },
  { label: "HIGH RISK", value: 39407, percentage: 14.9 },
];

const modelMetrics = [
  { label: "Accuracy", value: 98.58 },
  { label: "Macro F1", value: 97.18 },
  { label: "Weighted F1", value: 98.57 },
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

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🚢</div>
        <h2>Shipment Risk</h2>
        <p>Analysis System</p>

        <nav>
          <button className="active">Dashboard</button>
          <button>Dataset</button>
          <button>Model</button>
          <button>Risk</button>
        </nav>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <h1>Shipment Risk Dashboard</h1>
            <p>
              Overview of the cleaned shipment dataset, engineered features and
              KNN model performance.
            </p>
          </div>

          <div className="status-pill">Validated Dataset</div>
        </header>

        <section className="cards">
          {overviewCards.map((card) => (
            <div className="card" key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.note}</p>
            </div>
          ))}
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

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>KNN Model Performance</h3>
                <p>Evaluation results from the trained KNN model.</p>
              </div>
            </div>

            <div className="metric-chart">
              {modelMetrics.map((metric) => (
                <div className="metric-row" key={metric.label}>
                  <div className="metric-title">
                    <span>{metric.label}</span>
                    <strong>{metric.value}%</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill model-score"
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
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
      </main>
    </div>
  );
}

export default App;