import { useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import ProgressBar from "../components/ProgressBar";
import { getAuthHeaders } from "../auth";

function toPercentNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number((number * 100).toFixed(2)) : 0;
}

function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${toPercentNumber(value).toFixed(2)}%`;
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "—";
}

function formatDecimal(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function getMacroF1(model) {
  return model?.macro_f1 ?? model?.["macro avg"]?.["f1-score"] ?? null;
}

function getWeightedF1(model) {
  return model?.weighted_f1 ?? model?.["weighted avg"]?.["f1-score"] ?? null;
}

function getHighRiskMetric(model, metric) {
  return (
    model?.classification_report?.["HIGH RISK"]?.[metric] ??
    model?.["HIGH RISK"]?.[metric] ??
    null
  );
}

function getMatrix(model) {
  const confusionMatrix = model?.confusion_matrix;

  if (Array.isArray(confusionMatrix)) {
    return confusionMatrix;
  }

  if (Array.isArray(confusionMatrix?.matrix)) {
    return confusionMatrix.matrix;
  }

  return [
    [0, 0],
    [0, 0],
  ];
}

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await fetch("/api/dashboard/summary", {
            headers: getAuthHeaders(),
                      });

        if (!response.ok) {
          throw new Error("Dashboard data could not be loaded.");
        }

        const data = await response.json();
        setDashboardData(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Loading dashboard...</h3>
          <p>Reading dataset and model metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Dashboard connection error</h3>
          <p>{error}</p>
        </section>
      </div>
    );
  }

  const overviewCards = dashboardData?.overview_cards ?? [];
  const overview = dashboardData?.overview ?? {};
  const riskData = dashboardData?.risk_distribution ?? [];
  const sampleRows = dashboardData?.sample_rows ?? [];
  const featureImpact = dashboardData?.feature_impact ?? [];

  const decisionTreeModel = dashboardData?.models?.decision_tree ?? null;
  const neuralNetworkModel = dashboardData?.models?.neural_network ?? null;
  const svmModel = dashboardData?.models?.svm ?? null;

  const decisionTreeAccuracy = toPercentNumber(decisionTreeModel?.accuracy);
  const decisionTreeF1 = toPercentNumber(decisionTreeModel?.f1_score);
  const decisionTreePrecision = toPercentNumber(decisionTreeModel?.precision);
  const decisionTreeRecall = toPercentNumber(decisionTreeModel?.recall);

  const neuralNetworkAccuracy = toPercentNumber(neuralNetworkModel?.accuracy);
  const neuralNetworkF1 = toPercentNumber(neuralNetworkModel?.f1_score);
  const neuralNetworkPrecision = toPercentNumber(
    neuralNetworkModel?.classification_report?.["HIGH RISK"]?.precision
  );
  const neuralNetworkRecall = toPercentNumber(
    neuralNetworkModel?.classification_report?.["HIGH RISK"]?.recall
  );

  const svmAccuracy = toPercentNumber(svmModel?.accuracy);
  const svmF1 = toPercentNumber(svmModel?.f1_score);
  const svmPrecision = toPercentNumber(svmModel?.precision);
  const svmRecall = toPercentNumber(svmModel?.recall);

  const circularStats = [
    {
      label: "Low Risk",
      value: Number(overview.low_risk_share ?? 0),
      detail: `${formatCount(
        riskData.find((item) => item.label === "LOW RISK")?.value
      )} records`,
      className: "circle-low",
    },
    {
      label: "High Risk",
      value: Number(overview.high_risk_share ?? 0),
      detail: `${formatCount(
        riskData.find((item) => item.label === "HIGH RISK")?.value
      )} records`,
      className: "circle-high",
    },
    {
      label: "Decision Tree",
      value: decisionTreeAccuracy,
      detail: "Completed model",
      className: "circle-model",
    },
    {
      label: "Neural Network",
      value: neuralNetworkAccuracy,
      detail: "Completed model",
      className: "circle-benchmark",
    },
    {
      label: "SVM Accuracy",
      value: svmAccuracy,
      detail: "Risk-focused model",
      className: "circle-model",
    },
  ];

  const completedModels = [
    {
      name: "Decision Tree",
      role: "Interpretable classifier",
      status: "Completed",
      accuracy: decisionTreeAccuracy,
      f1: decisionTreeF1,
      precision: decisionTreePrecision,
      recall: decisionTreeRecall,
      insight:
        "Decision Tree is useful for clear interpretation and feature tracing.",
    },
    {
      name: "Neural Network",
      role: "Non-linear classifier",
      status: "Completed",
      accuracy: neuralNetworkAccuracy,
      f1: neuralNetworkF1,
      precision: neuralNetworkPrecision,
      recall: neuralNetworkRecall,
      insight:
        "Neural Network captures more complex patterns in the cleaned shipment data.",
    },
    {
      name: "SVM",
      role: "Boundary-focused classifier",
      status: "Completed",
      accuracy: svmAccuracy,
      f1: svmF1,
      precision: svmPrecision,
      recall: svmRecall,
      insight:
        "SVM is the strongest model for catching risky shipments aggressively.",
    },
  ];

  const metricsMatrix = [
    {
      metric: "Accuracy",
      decisionTree: `${decisionTreeAccuracy.toFixed(2)}%`,
      neuralNetwork: `${neuralNetworkAccuracy.toFixed(2)}%`,
      svm: `${svmAccuracy.toFixed(2)}%`,
    },
    {
      metric: "F1 Score",
      decisionTree: `${decisionTreeF1.toFixed(2)}%`,
      neuralNetwork: `${neuralNetworkF1.toFixed(2)}%`,
      svm: `${svmF1.toFixed(2)}%`,
    },
    {
      metric: "Precision",
      decisionTree: `${decisionTreePrecision.toFixed(2)}%`,
      neuralNetwork: `${neuralNetworkPrecision.toFixed(2)}%`,
      svm: `${svmPrecision.toFixed(2)}%`,
    },
    {
      metric: "Recall",
      decisionTree: `${decisionTreeRecall.toFixed(2)}%`,
      neuralNetwork: `${neuralNetworkRecall.toFixed(2)}%`,
      svm: `${svmRecall.toFixed(2)}%`,
    },
  ];

  const bestModel =
    [decisionTreeModel, neuralNetworkModel, svmModel]
      .filter(Boolean)
      .sort((left, right) => (Number(right?.accuracy ?? 0) - Number(left?.accuracy ?? 0)))[0] ??
    decisionTreeModel;

  const matrix = getMatrix(bestModel);

  const confusionMatrix = [
    {
      actual: "LOW RISK",
      predicted: "LOW RISK",
      value: formatCount(matrix?.[0]?.[0]),
      type: "correct",
    },
    {
      actual: "LOW RISK",
      predicted: "HIGH RISK",
      value: formatCount(matrix?.[0]?.[1]),
      type: "error",
    },
    {
      actual: "HIGH RISK",
      predicted: "LOW RISK",
      value: formatCount(matrix?.[1]?.[0]),
      type: "error",
    },
    {
      actual: "HIGH RISK",
      predicted: "HIGH RISK",
      value: formatCount(matrix?.[1]?.[1]),
      type: "correct",
    },
  ];

  const visibleFeatureImpact = featureImpact.slice(0, 5);

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Shipment Risk Dashboard</h1>
          <p>
            Executive overview of the cleaned shipment dataset, risk structure,
            completed model performance and future model roadmap.
          </p>
        </div>

        <div className="status-pill">Live Backend Data</div>
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
                  <strong>{item.value.toFixed(2)}%</strong>
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
                  <strong>{formatCount(item.value)}</strong>
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
            <strong>{bestModel?.model || "Decision Tree"}</strong>
            <p>
              The strongest completed model varies by metric, so the dashboard
              now compares Decision Tree, Neural Network, and SVM only. The
              current risk label is simulated, so model performance should be
              presented as prototype evaluation rather than real-world fraud
              detection accuracy.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
              <h3>Completed Model Comparison</h3>
              <p>
              Comparison of the three models currently visible in the system.
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
              <h3>Best Model Confusion Matrix</h3>
              <p>
                Model evaluation matrix showing correct and incorrect
                classifications.
              </p>
            </div>
          </div>

          <div className="confusion-matrix">
            <div className="matrix-corner" />
            <div className="matrix-axis">Predicted Low</div>
            <div className="matrix-axis">Predicted High</div>

            <div className="matrix-axis">Actual Low</div>
            {confusionMatrix.slice(0, 2).map((cell) => (
              <div
                className={`matrix-cell ${cell.type}`}
                key={`${cell.actual}-${cell.predicted}`}
              >
                <strong>{cell.value}</strong>
                <span>{cell.predicted}</span>
              </div>
            ))}

            <div className="matrix-axis">Actual High</div>
            {confusionMatrix.slice(2, 4).map((cell) => (
              <div
                className={`matrix-cell ${cell.type}`}
                key={`${cell.actual}-${cell.predicted}`}
              >
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
              <p>Side-by-side comparison of completed model results.</p>
            </div>
          </div>

          <div className="metrics-heatmap">
            <div className="heatmap-row heatmap-header">
              <span>Metric</span>
              <strong>Decision Tree</strong>
              <strong>Neural Net</strong>
              <strong>SVM</strong>
            </div>

            {metricsMatrix.map((row) => (
              <div className="heatmap-row" key={row.metric}>
                <span>{row.metric}</span>
                <strong className="heatmap-strong">{row.decisionTree}</strong>
                <strong className="heatmap-weak">{row.neuralNetwork}</strong>
                <strong className="heatmap-weak">{row.svm}</strong>
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
              <p>Feature differences between low-risk and high-risk records.</p>
            </div>
          </div>

          <div className="feature-impact-list">
            {visibleFeatureImpact.map((feature) => (
              <div className="metric-row" key={feature.feature}>
                <div className="metric-title">
                  <span>{feature.feature.replaceAll("_", " ")}</span>
                  <strong>{feature.impact_score}%</strong>
                </div>

                <div className="bar-track">
                  <div
                    className="bar-fill model-score"
                    style={{ width: `${feature.impact_score}%` }}
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
              <strong>{formatCount(overview.missing_values)}</strong>
            </div>
            <div>
              <span>Duplicate Rows</span>
              <strong>{formatCount(overview.duplicate_rows)}</strong>
            </div>
            <div>
              <span>Validation</span>
              <strong>{dashboardData?.data_quality?.validation_status}</strong>
            </div>
            <div>
              <span>Columns</span>
              <strong>{formatCount(overview.total_columns)}</strong>
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
                <tr key={`${row.product_name}-${row.shipment_date}-${row.tax_ratio}`}>
                  <td>{row.product_name}</td>
                  <td>${formatDecimal(row.price_usd, 2)}</td>
                  <td>{formatDecimal(row.weight_kg, 2)} kg</td>
                  <td>{formatDecimal(row.volume_m3, 4)} m³</td>
                  <td>{formatDecimal(row.tax_ratio, 4)}</td>
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
    </div>
  );
}

export default Dashboard;
