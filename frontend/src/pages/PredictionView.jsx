import React, { useState } from "react";

const PredictionView = () => {
  const [formData, setFormData] = useState({ price: "", weight: "", tax: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const price = Number(formData.price);
      const tax = Number(formData.tax);

      if (!price || price <= 0) {
        throw new Error("Price must be greater than zero");
      }

      const payload = {
        tax,
        tax_ratio: Number((tax / price).toFixed(4)),
      };

      const response = await fetch("/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch prediction");
      }

      setResult(data.risk);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const price = Number(formData.price);
  const tax = Number(formData.tax);
  const taxRatioPreview = price > 0 ? (tax / price).toFixed(4) : "0.0000";
  const isError = typeof result === "string" && result.startsWith("Error:");

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Import Risk Prediction</h1>
          <p>Enter shipment values below to estimate whether the transaction looks low or high risk.</p>
        </div>
        <div className="header-badge">ML Powered</div>
      </header>

      <section className="prediction-grid">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h3>Prediction Form</h3>
              <p>The current model uses tax and tax ratio to return a risk label.</p>
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
              />
            </label>

            <label className="field">
              <span>Weight</span>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
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
              />
            </label>

            <button className="primary-button" type="submit">
              {loading ? "Predicting..." : "Predict Risk"}
            </button>
          </form>
        </div>

        <div className="panel result-panel">
          <div className="panel-heading">
            <div>
              <h3>Prediction Summary</h3>
              <p>Quick preview of the values that are sent to the prediction service.</p>
            </div>
          </div>

          <div className="summary-list">
            <div className="summary-row">
              <span>Entered Price</span>
              <strong>{formData.price || "—"}</strong>
            </div>
            <div className="summary-row">
              <span>Entered Tax</span>
              <strong>{formData.tax || "—"}</strong>
            </div>
            <div className="summary-row">
              <span>Calculated Tax Ratio</span>
              <strong>{taxRatioPreview}</strong>
            </div>
          </div>

          <div className={`prediction-result${isError ? " error" : ""}`}>
            <span>Prediction Result</span>
            <strong>{result || "Waiting for submission"}</strong>
          </div>
        </div>
      </section>
    </>
  );
};

export default PredictionView;
