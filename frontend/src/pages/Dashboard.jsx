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

  const knnModel =
    dashboardData?.models?.knn_latest ??
    dashboardData?.models?.knn_demo ??
    null;

  const logisticModel = dashboardData?.models?.logistic_regression ?? null;

  const knnAccuracy = toPercentNumber(knnModel?.accuracy);
  const knnMacroF1 = toPercentNumber(getMacroF1(knnModel));
  const knnWeightedF1 = toPercentNumber(getWeightedF1(knnModel));
  const knnPrecision = toPercentNumber(getHighRiskMetric(knnModel, "precision"));
  const knnRecall = toPercentNumber(getHighRiskMetric(knnModel, "recall"));

  const logisticAccuracy = toPercentNumber(logisticModel?.accuracy);
  const logisticF1 = toPercentNumber(logisticModel?.f1_score);
  const logisticPrecision = toPercentNumber(logisticModel?.precision);
  const logisticRecall = toPercentNumber(logisticModel?.recall);

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
      label: "KNN Accuracy",
      value: knnAccuracy,
      detail: "Best completed model",
      className: "circle-model",
    },
    {
      label: "Logistic Accuracy",
      value: logisticAccuracy,
      detail: "Benchmark model",
      className: "circle-benchmark",
    },
  ];

  const completedModels = [
    {
      name: "KNN",
      role: "Best completed classifier",
      status: "Completed",
      accuracy: knnAccuracy,
      f1: knnMacroF1,
      precision: knnPrecision,
      recall: knnRecall,
      insight:
        "KNN is currently the strongest completed model in the interface. For now, the dashboard uses the latest KNN metrics file.",
    },
    {
      name: "Logistic Regression",
      role: "Interpretable benchmark model",
      status: "Completed",
      accuracy: logisticAccuracy,
      f1: logisticF1,
      precision: logisticPrecision,
      recall: logisticRecall,
      insight:
        "Logistic Regression is kept as a transparent benchmark model, but its performance is weaker than KNN.",
    },
  ];

  const metricsMatrix = [
    {
      metric: "Accuracy",
      knn: `${knnAccuracy.toFixed(2)}%`,
      logistic: `${logisticAccuracy.toFixed(2)}%`,
    },
    {
      metric: "F1 Score",
      knn: `${knnMacroF1.toFixed(2)}%`,
      logistic: `${logisticF1.toFixed(2)}%`,
    },
    {
      metric: "Precision",
      knn: `${knnPrecision.toFixed(2)}%`,
      logistic: `${logisticPrecision.toFixed(2)}%`,
    },
    {
      metric: "Recall",
      knn: `${knnRecall.toFixed(2)}%`,
      logistic: `${logisticRecall.toFixed(2)}%`,
    },
  ];

  const matrix = getMatrix(knnModel);

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
            <strong>KNN</strong>
            <p>
              KNN currently outperforms Logistic Regression across the main
              evaluation metrics. The current risk label is simulated, so model
              performance should be presented as prototype evaluation rather
              than real-world fraud detection accuracy.
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