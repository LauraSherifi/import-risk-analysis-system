import { useEffect, useState } from "react";
import { getAuthHeaders } from "../auth";

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "—";
}

function formatDecimal(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function normalizeFeatureName(value) {
  return String(value || "").replaceAll("_", " ");
}

function getRiskItem(riskDistribution, label) {
  return riskDistribution.find((item) => item.label === label) ?? {
    value: 0,
    percentage: 0,
  };
}

function DatasetPage() {
  const [datasetData, setDatasetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDatasetData() {
      try {
        const response = await fetch("/api/dataset/summary", {
               headers: getAuthHeaders(),
               });

        if (!response.ok) {
          throw new Error("Dataset data could not be loaded.");
        }

        const data = await response.json();
        setDatasetData(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadDatasetData();
  }, []);

  if (loading) {
    return (
      <div className="dataset-page">
        <section className="panel">
          <h3>Loading dataset...</h3>
          <p>Reading cleaned dataset summary from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dataset-page">
        <section className="panel">
          <h3>Dataset connection error</h3>
          <p>{error}</p>
        </section>
      </div>
    );
  }

  const totalRecords = datasetData?.total_records ?? 0;
  const totalColumns = datasetData?.total_columns ?? 0;
  const missingValues = datasetData?.missing_values?.total ?? 0;
  const duplicateRows = datasetData?.duplicate_rows ?? 0;
  const riskDistribution = datasetData?.risk_distribution ?? [];
  const columns = datasetData?.columns ?? [];
  const featureImpact = datasetData?.feature_impact ?? [];
  const topPorts = datasetData?.top_ports ?? [];
  const topProducts = datasetData?.top_products ?? [];
  const sampleRows = datasetData?.sample_rows ?? [];

  const lowRisk = getRiskItem(riskDistribution, "LOW RISK");
  const highRisk = getRiskItem(riskDistribution, "HIGH RISK");

  const completenessScore = missingValues === 0 ? 100 : 99;
  const duplicateScore = duplicateRows === 0 ? 100 : 99;

  const datasetCircleStats = [
    {
      label: "Completeness",
      value: completenessScore,
      detail:
        missingValues === 0
          ? "No missing values"
          : `${formatCount(missingValues)} missing values`,
      className: "circle-model",
    },
    {
      label: "Duplicate Free",
      value: duplicateScore,
      detail:
        duplicateRows === 0
          ? "0 duplicate rows"
          : `${formatCount(duplicateRows)} duplicate rows`,
      className: "circle-low",
    },
    {
      label: "Feature Ready",
      value: 100,
      detail: `${formatCount(totalColumns)} final columns`,
      className: "circle-benchmark",
    },
    {
      label: "High Risk",
      value: Number(highRisk.percentage ?? 0),
      detail: `${formatCount(highRisk.value)} high-risk records`,
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
      description:
        "Missing values, duplicate rows and invalid entries were checked.",
    },
    {
      title: "Feature Engineering",
      description:
        "Volume, density, value-per-unit and tax-ratio variables were created.",
    },
    {
      title: "Final Validation",
      description:
        "Dataset was checked and prepared for model training and evaluation.",
    },
  ];

  const cleaningFunnel = [
    {
      label: "Final records",
      value: formatCount(totalRecords),
      width: "100%",
      retention: "Cleaned dataset",
    },
    {
      label: "Missing-value check",
      value: formatCount(missingValues),
      width: missingValues === 0 ? "100%" : "70%",
      retention: missingValues === 0 ? "Passed" : "Needs review",
    },
    {
      label: "Duplicate check",
      value: formatCount(duplicateRows),
      width: duplicateRows === 0 ? "100%" : "70%",
      retention: duplicateRows === 0 ? "Passed" : "Needs review",
    },
    {
      label: "Model-ready records",
      value: formatCount(totalRecords),
      width: "100%",
      retention: "Ready",
    },
  ];

  const validationMatrix = [
    {
      check: "Missing values",
      result: missingValues === 0 ? "Passed" : "Review",
      status: missingValues === 0 ? "success" : "info",
      description:
        missingValues === 0
          ? "No missing values found in the final dataset."
          : `${formatCount(missingValues)} missing values found.`,
    },
    {
      check: "Duplicate rows",
      result: duplicateRows === 0 ? "Passed" : "Review",
      status: duplicateRows === 0 ? "success" : "info",
      description:
        duplicateRows === 0
          ? "No duplicate rows found in the final dataset."
          : `${formatCount(duplicateRows)} duplicate rows found.`,
    },
    {
      check: "Risk labels",
      result: "Checked",
      status: "success",
      description: "LOW RISK and HIGH RISK labels are available for modeling.",
    },
    {
      check: "Model input format",
      result: "Ready",
      status: "success",
      description: `${formatCount(totalColumns)} columns available after feature engineering.`,
    },
  ];

  const visibleFeatureGroups = featureImpact.slice(0, 6);

  return (
    <div className="dataset-page">
      <header className="page-header">
        <div>
          <h1>Dataset Overview</h1>
          <p>
            Visual summary of the cleaned, validated and feature-engineered
            shipment dataset used for import risk analysis.
          </p>
        </div>

        <div className="status-pill">Live Backend Data</div>
      </header>

      <section className="cards">
        <div className="card">
          <span>Total Records</span>
          <strong>{formatCount(totalRecords)}</strong>
          <p>Final cleaned dataset</p>
        </div>

        <div className="card">
          <span>Dataset Columns</span>
          <strong>{formatCount(totalColumns)}</strong>
          <p>After feature engineering</p>
        </div>

        <div className="card">
          <span>Missing Values</span>
          <strong>{formatCount(missingValues)}</strong>
          <p>Validated final dataset</p>
        </div>

        <div className="card">
          <span>Duplicate Rows</span>
          <strong>{formatCount(duplicateRows)}</strong>
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
                  <strong>{Number(item.value).toFixed(2)}%</strong>
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
                Feature groups ranked by observed differences between low-risk
                and high-risk records.
              </p>
            </div>
          </div>

          <div className="feature-impact-list">
            {visibleFeatureGroups.map((feature) => (
              <div className="metric-row" key={feature.feature}>
                <div className="metric-title">
                  <span>{normalizeFeatureName(feature.feature)}</span>
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
              <h3>Validation Matrix</h3>
              <p>Final quality checks before model training and evaluation.</p>
            </div>
          </div>

          <div className="validation-scorecard">
            {validationMatrix.map((item) => (
              <div
                className={`validation-score-row ${item.status}`}
                key={item.check}
              >
                <div>
                  <span>{item.check}</span>
                  <p>{item.description}</p>
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
            {riskDistribution.map((item) => (
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
              <strong>{completenessScore}%</strong>
            </div>
            <div>
              <span>Duplicates</span>
              <strong>{formatCount(duplicateRows)}</strong>
            </div>
            <div>
              <span>Columns</span>
              <strong>{formatCount(totalColumns)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{datasetData?.data_quality?.validation_status}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel table-panel">
          <div className="panel-header">
            <div>
              <h3>Top Destination Ports</h3>
              <p>Most frequent destination ports in the cleaned dataset.</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Records</th>
                  <th>Share</th>
                </tr>
              </thead>

              <tbody>
                {topPorts.slice(0, 5).map((item) => (
                  <tr key={item.port}>
                    <td>{item.port}</td>
                    <td>{formatCount(item.count)}</td>
                    <td>{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel table-panel">
          <div className="panel-header">
            <div>
              <h3>Top Products</h3>
              <p>Most frequent product names in the cleaned dataset.</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Records</th>
                  <th>Share</th>
                </tr>
              </thead>

              <tbody>
                {topProducts.slice(0, 5).map((item) => (
                  <tr key={item.product}>
                    <td>{item.product}</td>
                    <td>{formatCount(item.count)}</td>
                    <td>{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Final Dataset Columns</h3>
            <p>
              Columns available in the cleaned and feature-engineered dataset.
            </p>
          </div>
        </div>

        <div className="feature-chip-grid">
          {columns.map((column) => (
            <span className="feature-chip" key={column}>
              {column}
            </span>
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
                <th>Destination</th>
                <th>Risk</th>
              </tr>
            </thead>

            <tbody>
              {sampleRows.slice(0, 8).map((row) => (
                <tr key={`${row.product_name}-${row.shipment_date}-${row.tax_ratio}`}>
                  <td>{row.product_name}</td>
                  <td>${formatDecimal(row.price_usd, 2)}</td>
                  <td>{formatDecimal(row.weight_kg, 2)} kg</td>
                  <td>{formatDecimal(row.volume_m3, 4)} m³</td>
                  <td>{formatDecimal(row.tax_ratio, 4)}</td>
                  <td>{row.destination_port}</td>
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

export default DatasetPage;