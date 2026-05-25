import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "../auth";

const initialFormData = {
  price: "",
  weight: "",
  tax: "",
};

const formatPercent = (value) => {
  if (value == null || Number.isNaN(Number(value))) {
    return "Not available";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
};

const PredictionView = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");

  const price = Number(formData.price);
  const tax = Number(formData.tax);
  const taxRatioPreview = price > 0 ? Number((tax / price).toFixed(4)) : 0;
  const isHighRisk = result?.risk === "HIGH RISK";

  const probabilityRows = useMemo(() => {
    if (!result?.probabilities) {
      return [];
    }

    return Object.entries(result.probabilities).map(([label, value]) => ({
      label,
      value: Number(value),
    }));
  }, [result]);

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
        price,
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
    <>
      <header className="page-header">
        <div>
          <h1>Import Risk Prediction</h1>
          <p>
            Enter shipment values, generate a risk prediction, and review recent
            prediction history in one workspace.
          </p>
        </div>
        <div className="status-pill">ML Powered</div>
      </header>

      <section className="prediction-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Prediction Form</h3>
              <p>The current prediction service uses tax and tax ratio.</p>
            </div>
          </div>

          <form className="prediction-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Price</span>
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
              <span>Weight</span>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="Optional"
              />
            </label>

            <label className="field">
              <span>Tax</span>
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

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Predicting..." : "Predict Risk"}
            </button>
          </form>
        </div>

        <div className="panel result-panel">
          <div className="panel-header">
            <div>
              <h3>Prediction Summary</h3>
              <p>Preview of values sent to the prediction service.</p>
            </div>
          </div>

          <div className="summary-list">
            <div className="summary-row">
              <span>Entered Price</span>
              <strong>{formData.price || "-"}</strong>
            </div>

            <div className="summary-row">
              <span>Entered Tax</span>
              <strong>{formData.tax || "-"}</strong>
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
            <span>Prediction Result</span>
            <strong>
              {loading && "Calculating..."}
              {!loading && error}
              {!loading && !error && (result?.risk || "Waiting for submission")}
            </strong>
          </div>

          {result && !error && (
            <div className="confidence-panel">
              <div className="confidence-header">
                <span>Confidence</span>
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
      </section>

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
          <strong>{summary?.latest_prediction_at ? "Available" : "—"}</strong>
          <p>{summary?.latest_prediction_at || "No prediction submitted yet"}</p>
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

        {historyError && (
          <div className="prediction-result result-error">
            <span>Connection Error</span>
            <strong>{historyError}</strong>
          </div>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Risk</th>
                <th>Tax</th>
                <th>Tax Ratio</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="5">No prediction history available yet.</td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>
                      <span
                        className={`risk-badge ${
                          item.risk === "HIGH RISK"
                            ? "badge-high"
                            : "badge-low"
                        }`}
                      >
                        {item.risk}
                      </span>
                    </td>
                    <td>{item.input?.tax}</td>
                    <td>{item.input?.tax_ratio}</td>
                    <td>{item.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default PredictionView;