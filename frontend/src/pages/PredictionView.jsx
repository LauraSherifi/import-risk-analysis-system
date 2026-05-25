import { useMemo, useState } from "react";
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
            Enter shipment values to estimate whether the transaction looks low
            or high risk.
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
    </>
  );
};

export default PredictionView;
