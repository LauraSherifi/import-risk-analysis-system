import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "../auth";
import { predictionLabDataset } from "../data/predictionLabData";

const initialFormData = {
  productName: "",
  destinationPort: predictionLabDataset.topPorts[0].name,
  price: "",
  weight: "",
  volume: "",
  tax: "",
};

const impactLabels = {
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
  positive: "Protective signal",
};

const prePredictionTips = [
  {
    title: "Tax ratio check",
    detail:
      "The classifier pays closest attention to how tax compares to invoice value.",
  },
  {
    title: "Use dataset samples",
    detail:
      "Click one of the sample shipment cards to test a real profile from the processed dataset.",
  },
  {
    title: "Compare against averages",
    detail:
      "Weight, tax, and invoice value are shown against dataset benchmarks after submission.",
  },
];

const formatPercent = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "Not available";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US").format(Number(value || 0));

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatCompactCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

function PredictionView() {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");

  const price = Number(formData.price);
  const weight = Number(formData.weight);
  const tax = Number(formData.tax);
  const taxRatioPreview = price > 0 ? Number((tax / price).toFixed(4)) : 0;
  const isHighRisk = result?.risk === "HIGH RISK";
  const riskScore = Math.round(Number(result?.confidence || 0) * 100);

  const allDatasetSamples = useMemo(
    () => [
      ...predictionLabDataset.featuredSamples,
      ...predictionLabDataset.comparisonSamples,
    ],
    []
  );

  const probabilityRows = useMemo(() => {
    if (!result?.probabilities) {
      return [];
    }

    return Object.entries(result.probabilities).map(([label, value]) => ({
      label,
      value: Number(value),
    }));
  }, [result]);

  const activePort = useMemo(
    () =>
      predictionLabDataset.topPorts.find(
        (port) => port.name === formData.destinationPort
      ) || predictionLabDataset.topPorts[0],
    [formData.destinationPort]
  );

  const keyFactors = useMemo(() => {
    const { averagePriceUsd, averageWeightKg, averageTaxUsd, taxRatioQuartiles } =
      predictionLabDataset;

    const nextFactors = [];

    if (price > 0) {
      if (taxRatioPreview <= taxRatioQuartiles.low) {
        nextFactors.push({
          title: "Very low tax ratio",
          detail: `${taxRatioPreview.toFixed(4)} is below the lower dataset band of ${taxRatioQuartiles.low.toFixed(4)}.`,
          impact: "high",
        });
      } else if (taxRatioPreview >= taxRatioQuartiles.high) {
        nextFactors.push({
          title: "Tax ratio above stronger range",
          detail: `${taxRatioPreview.toFixed(4)} is above the upper dataset band of ${taxRatioQuartiles.high.toFixed(4)}.`,
          impact: "positive",
        });
      } else {
        nextFactors.push({
          title: "Tax ratio near dataset center",
          detail: `${taxRatioPreview.toFixed(4)} sits close to the dataset median of ${taxRatioQuartiles.median.toFixed(4)}.`,
          impact: "low",
        });
      }

      nextFactors.push({
        title:
          price >= averagePriceUsd
            ? "Invoice value above average"
            : "Invoice value below average",
        detail:
          price >= averagePriceUsd
            ? `${formatCompactCurrency(price)} is above the dataset average of ${formatCompactCurrency(averagePriceUsd)}.`
            : `${formatCompactCurrency(price)} is below the dataset average of ${formatCompactCurrency(averagePriceUsd)}.`,
        impact: price >= averagePriceUsd ? "medium" : "low",
      });
    }

    if (Number.isFinite(weight) && weight > 0) {
      nextFactors.push({
        title:
          weight >= averageWeightKg
            ? "Heavy shipment profile"
            : "Light shipment profile",
        detail:
          weight >= averageWeightKg
            ? `${weight.toFixed(2)} kg is above the dataset average of ${averageWeightKg.toFixed(2)} kg.`
            : `${weight.toFixed(2)} kg is below the dataset average of ${averageWeightKg.toFixed(2)} kg.`,
        impact: weight >= averageWeightKg ? "medium" : "low",
      });
    }

    if (tax > 0) {
      nextFactors.push({
        title:
          tax >= averageTaxUsd
            ? "Declared tax above average"
            : "Declared tax below average",
        detail:
          tax >= averageTaxUsd
            ? `${formatCurrency(tax)} exceeds the average declared tax of ${formatCurrency(averageTaxUsd)}.`
            : `${formatCurrency(tax)} is below the average declared tax of ${formatCurrency(averageTaxUsd)}.`,
        impact: tax >= averageTaxUsd ? "medium" : "low",
      });
    }

    nextFactors.push({
      title: "Destination port activity",
      detail: `${activePort.name} appears in ${formatNumber(activePort.shipmentCount)} processed shipments.`,
      impact: "low",
    });

    return nextFactors.slice(0, 4);
  }, [activePort, price, tax, taxRatioPreview, weight]);

  const similarShipments = useMemo(() => {
    const rankedSamples = allDatasetSamples
      .map((sample) => ({
        ...sample,
        distance:
          Math.abs(sample.taxRatio - taxRatioPreview) +
          Math.abs(sample.priceUsd - (price || sample.priceUsd)) / 1000,
      }))
      .sort((left, right) => left.distance - right.distance);

    return rankedSamples.slice(0, 3);
  }, [allDatasetSamples, price, taxRatioPreview]);

  const loadPredictionHistory = async () => {
    try {
      const headers = getAuthHeaders();
      const summaryResponse = await fetch("/prediction-history/summary", {
        headers,
      });
      const historyResponse = await fetch("/prediction-history", {
        headers,
      });

      if (!summaryResponse.ok || !historyResponse.ok) {
        throw new Error("Unable to load prediction history");
      }

      const summaryData = await summaryResponse.json();
      const historyData = await historyResponse.json();

      setSummary(summaryData);
      setHistory(historyData.items || []);
      setHistoryError("");
    } catch (loadError) {
      setHistoryError(loadError.message);
    }
  };

  useEffect(() => {
    loadPredictionHistory();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleApplyDatasetSample = (sample) => {
    setFormData({
      productName: sample.productName,
      destinationPort: sample.destinationPort,
      price: String(sample.priceUsd),
      weight: String(sample.weightKg),
      volume: String(sample.volumeM3 ?? ""),
      tax: String(sample.taxUsd),
    });
    setError("");
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setResult(null);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError("");

    try {
      if (!price || price <= 0) {
        throw new Error("Price must be greater than zero.");
      }

      if (!Number.isFinite(tax) || tax < 0) {
        throw new Error("Tax must be zero or greater.");
      }

      const payload = {
        product_name: formData.productName.trim(),
        destination_port: formData.destinationPort,
        price,
        weight_kg: Number.isFinite(weight) ? weight : null,
        volume_m3: Number.isFinite(Number(formData.volume))
          ? Number(formData.volume)
          : null,
        tax,
        tax_ratio: taxRatioPreview,
      };

      const response = await fetch("/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch prediction.");
      }

      setResult(data);
      await loadPredictionHistory();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prediction-page">
      <header className="page-header">
        <div>
          <h1>Prediction Lab</h1>
          <p>
            Analyze shipment records with the active ML service, compare them
            against the processed dataset, and review live risk patterns inside
            the app.
          </p>
        </div>
        <div className="status-pill">Dataset Connected</div>
      </header>

      <section className="prediction-topbar">
        <div className="prediction-meta-card">
          <span>Model in Use</span>
          <strong>{predictionLabDataset.model.name}</strong>
          <small>
            {predictionLabDataset.model.accuracy}% accuracy on{" "}
            {formatNumber(predictionLabDataset.model.testRows)} test rows
          </small>
        </div>

        <div className="prediction-meta-card">
          <span>Dataset Scope</span>
          <strong>
            {formatNumber(predictionLabDataset.totalShipments)} processed
            shipments
          </strong>
          <small>
            Every benchmark on this page comes from the cleaned shipment dataset
            used by the app.
          </small>
        </div>
      </section>

      <section className="prediction-lab-layout">
        <div className="prediction-lab-main-column">
          <div className="panel prediction-lab-form-panel">
            <div className="panel-header">
              <div>
                <h3>Enter Shipment Details</h3>
                <p>
                  The live model predicts from tax and tax ratio. The additional
                  shipment fields drive the dataset comparison cards and saved
                  prediction context.
                </p>
              </div>
            </div>

            <div className="dataset-sample-strip">
              {predictionLabDataset.featuredSamples.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="dataset-sample-card"
                  onClick={() => handleApplyDatasetSample(sample)}
                >
                  <strong>{sample.productName}</strong>
                  <span>{sample.destinationPort}</span>
                  <small>
                    {formatCurrency(sample.priceUsd)} |{" "}
                    {sample.taxRatio.toFixed(4)} tax ratio
                  </small>
                </button>
              ))}
            </div>

            <form className="prediction-form" onSubmit={handleSubmit}>
              <div className="prediction-form-grid">
                <label className="field">
                  <span>Product Name</span>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="Example: Camera Bag"
                  />
                </label>

                <label className="field">
                  <span>Destination Port</span>
                  <select
                    className="starter-select"
                    name="destinationPort"
                    value={formData.destinationPort}
                    onChange={handleChange}
                  >
                    {predictionLabDataset.topPorts.map((port) => (
                      <option key={port.name} value={port.name}>
                        {port.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="prediction-form-grid">
                <label className="field">
                  <span>Invoice Value (USD)</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Example: 120.00"
                  />
                </label>

                <label className="field">
                  <span>Weight (kg)</span>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="Example: 8.20"
                  />
                </label>
              </div>

              <div className="prediction-form-grid">
                <label className="field">
                  <span>Volume (m3)</span>
                  <input
                    type="number"
                    name="volume"
                    value={formData.volume}
                    onChange={handleChange}
                    min="0"
                    step="0.0001"
                    placeholder="Example: 0.1250"
                  />
                </label>

                <label className="field">
                  <span>Tax Amount (USD)</span>
                  <input
                    type="number"
                    name="tax"
                    value={formData.tax}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="Example: 18.00"
                  />
                </label>
              </div>

              <label className="field">
                <span>Calculated Tax Ratio</span>
                <div className="prediction-derived-field">
                  <strong>{taxRatioPreview.toFixed(4)}</strong>
                  <small>
                    Dataset median:{" "}
                    {predictionLabDataset.taxRatioQuartiles.median.toFixed(4)}
                  </small>
                </div>
              </label>

              <div className="prediction-button-row">
                <button
                  className="primary-button prediction-hero-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Predicting..." : "Predict Risk"}
                </button>

                <button
                  className="secondary-button prediction-reset-button"
                  type="button"
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="prediction-footnote">
              <strong>Real dataset note</strong>
              <p>
                This page only uses fields that exist in your shipment dataset:
                product name, destination port, price, weight, volume, tax, tax
                ratio, and risk behavior.
              </p>
            </div>

          </div>

          <div className="panel">
            <div className="panel-header">
              <div>
                <h3>Current Session Overview</h3>
                <p>
                  Live backend summary for the predictions generated in this
                  session.
                </p>
              </div>
            </div>

            <section className="cards prediction-history-cards">
              <div className="card">
                <span>Total Predictions</span>
                <strong>{summary?.total_predictions ?? 0}</strong>
                <p>Stored in current backend session</p>
              </div>

              <div className="card">
                <span>High Risk</span>
                <strong>{summary?.high_risk_count ?? 0}</strong>
                <p>Predictions classified as high risk</p>
              </div>

              <div className="card">
                <span>Low Risk</span>
                <strong>{summary?.low_risk_count ?? 0}</strong>
                <p>Predictions classified as low risk</p>
              </div>

              <div className="card">
                <span>Latest Prediction</span>
                <strong>{summary?.latest_prediction_at ? "Available" : "-"}</strong>
                <p>{summary?.latest_prediction_at || "No prediction submitted yet"}</p>
              </div>
            </section>

            {historyError && (
              <div className="prediction-result result-error prediction-overview-error">
                <span>Connection Error</span>
                <strong>{historyError}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="prediction-lab-side-column">
          <div className="panel result-panel prediction-result-panel">
            <div className="panel-header">
              <div>
                <h3>Prediction Result</h3>
                <p>
                  Live backend output paired with the most relevant shipment
                  benchmarks.
                </p>
              </div>
            </div>

            <div
              className={`prediction-hero-card ${
                isHighRisk ? "prediction-hero-high" : "prediction-hero-low"
              }`}
            >
              <div className="prediction-hero-main">
                <span>Predicted Status</span>
                <strong>
                  {loading && "Calculating..."}
                  {!loading && error}
                  {!loading &&
                    !error &&
                    (result?.risk || "Waiting for submission")}
                </strong>
                <p>
                  {result && !error
                    ? "The score below comes from the active ML endpoint and uses the tax behavior entered in this form."
                    : "Run a prediction to populate the result, confidence, and factor panels."}
                </p>
              </div>

              <div className="prediction-hero-score">
                <span>Risk Score</span>
                <strong>{result && !error ? `${riskScore}/100` : "--/100"}</strong>
              </div>
            </div>

            <div className="summary-list prediction-summary-list">
              <div className="summary-row">
                <span>Entered Price</span>
                <strong>
                  {formData.price ? formatCurrency(formData.price) : "-"}
                </strong>
              </div>

              <div className="summary-row">
                <span>Entered Tax</span>
                <strong>{formData.tax ? formatCurrency(formData.tax) : "-"}</strong>
              </div>

              <div className="summary-row">
                <span>Calculated Tax Ratio</span>
                <strong>{taxRatioPreview.toFixed(4)}</strong>
              </div>
            </div>

            <div
              className={`prediction-result ${
                result ? (isHighRisk ? "result-high" : "result-low") : ""
              } ${error ? "result-error" : ""}`}
            >
              <span>Model Response</span>
              <strong>
                {loading && "Calculating..."}
                {!loading && error}
                {!loading && !error && (result?.risk || "Waiting for submission")}
              </strong>
            </div>

            {result && !error && (
              <div className="confidence-panel">
                <div className="confidence-header">
                  <span>Risk Probability</span>
                  <strong>{formatPercent(result.confidence)}</strong>
                </div>

                <div className="bar-track confidence-track">
                  <div
                    className={`bar-fill ${
                      isHighRisk ? "high-risk" : "low-risk"
                    }`}
                    style={{ width: `${Number(result.confidence || 0) * 100}%` }}
                  />
                </div>

                {probabilityRows.length > 0 && (
                  <div className="probability-list">
                    {probabilityRows.map((item) => (
                      <div className="probability-row" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{formatPercent(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="panel prediction-side-panel">
            <div className="panel-header">
              <div>
                <h3>Key Factors</h3>
                <p>
                  These highlights are generated from the form values and real
                  dataset benchmarks.
                </p>
              </div>
            </div>

            <div className="prediction-factor-list">
              {result && !error
                ? keyFactors.map((factor) => (
                    <div className="prediction-factor-card" key={factor.title}>
                      <div>
                        <strong>{factor.title}</strong>
                        <p>{factor.detail}</p>
                      </div>
                      <span
                        className={`prediction-impact prediction-impact-${factor.impact}`}
                      >
                        {impactLabels[factor.impact]}
                      </span>
                    </div>
                  ))
                : prePredictionTips.map((tip) => (
                    <div
                      className="prediction-factor-card prediction-factor-card-placeholder"
                      key={tip.title}
                    >
                      <div>
                        <strong>{tip.title}</strong>
                        <p>{tip.detail}</p>
                      </div>
                      <span className="prediction-impact prediction-impact-low">
                        Ready
                      </span>
                    </div>
                  ))}
            </div>

            {!result && !error && (
              <div className="prediction-factor-placeholder-note">
                <strong>What changes after prediction?</strong>
                <p>
                  Once you submit a shipment, this section turns into a live factor
                  summary showing which dataset signals pushed the result toward
                  higher or lower risk.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="panel table-panel prediction-similar-section">
        <div className="panel-header">
          <div>
            <h3>Similar Dataset Shipments</h3>
            <p>
              Closest examples from the processed CSV based on tax ratio and
              invoice value.
            </p>
          </div>
        </div>

        <div className="prediction-similar-grid">
          {similarShipments.map((sample) => (
            <div className="prediction-similar-card" key={sample.id}>
              <div className="prediction-similar-header">
                <strong>{sample.productName}</strong>
                <span
                  className={`risk-badge ${
                    sample.risk === "HIGH RISK" ? "badge-high" : "badge-low"
                  }`}
                >
                  {sample.risk}
                </span>
              </div>
              <p>{sample.destinationPort}</p>
              <div className="prediction-similar-metrics">
                <span>{formatCurrency(sample.priceUsd)}</span>
                <span>{sample.taxRatio.toFixed(4)} tax ratio</span>
                <span>{sample.weightKg.toFixed(2)} kg</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="prediction-insight-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Dataset Risk Distribution</h3>
              <p>
                Real shipment split from the cleaned dataset used by the
                dashboard and models.
              </p>
            </div>
          </div>

          <div className="prediction-distribution-layout">
            <div className="prediction-donut-shell">
              <div className="prediction-donut-ring">
                <div
                  className="prediction-donut-fill"
                  style={{
                    background: `conic-gradient(#ef4444 0 ${predictionLabDataset.highRiskShare}%, #22c55e ${predictionLabDataset.highRiskShare}% 100%)`,
                  }}
                >
                  <div className="prediction-donut-center">
                    <strong>{predictionLabDataset.highRiskShare}%</strong>
                    <span>High risk</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="prediction-distribution-copy">
              <div className="prediction-distribution-row">
                <span>High-risk shipments</span>
                <strong>{formatNumber(predictionLabDataset.highRiskCount)}</strong>
              </div>
              <div className="prediction-distribution-row">
                <span>Low-risk shipments</span>
                <strong>{formatNumber(predictionLabDataset.lowRiskCount)}</strong>
              </div>
              <div className="prediction-distribution-row">
                <span>Average tax ratio</span>
                <strong>{predictionLabDataset.averageTaxRatio.toFixed(4)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Port Activity Snapshot</h3>
              <p>
                Top destination ports ranked by shipment count in the processed
                dataset.
              </p>
            </div>
          </div>

          <div className="prediction-port-list">
            {predictionLabDataset.topPorts.map((port) => (
              <div className="prediction-port-row" key={port.name}>
                <div className="prediction-port-copy">
                  <span>{port.name}</span>
                  <strong>{formatNumber(port.shipmentCount)}</strong>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${
                      port.name === activePort.name ? "model-score" : "low-risk"
                    }`}
                    style={{
                      width: `${
                        (port.shipmentCount /
                          predictionLabDataset.topPorts[0].shipmentCount) *
                        100
                      }%`,
                    }}
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
            <h3>Recent Predictions</h3>
            <p>
              Latest prediction requests saved by the backend during the current
              running session.
            </p>
          </div>

          <button
            className="secondary-button compact-button"
            type="button"
            onClick={loadPredictionHistory}
          >
            Refresh History
          </button>
        </div>

        <div className="prediction-history-scroll-shell">
          <div className="prediction-history-scroll-hint">
            Showing the latest 3 predictions. Scroll to see older entries.
          </div>

          <div className="table-wrapper prediction-history-table-wrapper">
          <table className="prediction-history-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Risk</th>
                <th>Product</th>
                <th>Destination Port</th>
                <th>Tax</th>
                <th>Tax Ratio</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7">No prediction history available yet.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <span
                        className={`risk-badge ${
                          item.risk === "HIGH RISK" ? "badge-high" : "badge-low"
                        }`}
                      >
                        {item.risk}
                      </span>
                    </td>
                    <td>{item.metadata?.product_name || "Manual entry"}</td>
                    <td>{item.metadata?.destination_port || "-"}</td>
                    <td>{item.input?.tax}</td>
                    <td>{item.input?.tax_ratio}</td>
                    <td>{item.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PredictionView;
