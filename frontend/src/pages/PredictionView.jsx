import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders } from "../auth";
import { useLabContext } from "../hooks/useLabContext";

const createInitialFormData = (predictionLabDataset) => ({
  productName: "",
  destinationPort: predictionLabDataset?.topPorts?.[0]?.name ?? "",
  price: "",
  weight: "",
  volume: "",
  length: "",
  width: "",
  height: "",
  tax: "",
});

const impactLabels = {
  high: "High impact",
  medium: "Medium impact",
  low: "Low impact",
  positive: "Protective signal",
};

const prePredictionTips = [
  {
    title: "Neural model inputs",
    detail:
      "The active model focuses on invoice value, weight, and shipment dimensions.",
  },
  {
    title: "Use dataset samples",
    detail:
      "Click one of the sample shipment cards to test a real profile from the processed dataset.",
  },
  {
    title: "Compare against averages",
    detail:
      "Weight, volume, and dimensions are shown against dataset benchmarks after submission.",
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

const toSafeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const buildGeometrySummary = (formData) => {
  const price = toSafeNumber(formData.price);
  const weight = toSafeNumber(formData.weight);
  const volume = toSafeNumber(formData.volume);
  const length = toSafeNumber(formData.length);
  const width = toSafeNumber(formData.width);
  const height = toSafeNumber(formData.height);
  const maxDimension = Math.max(length, width, height);
  const dimensionSum = length + width + height;
  const density = volume > 0 ? weight / volume : 0;
  const valuePerKg = weight > 0 ? price / weight : 0;
  const valuePerM3 = volume > 0 ? price / volume : 0;

  return {
    price,
    weight,
    volume,
    length,
    width,
    height,
    maxDimension,
    dimensionSum,
    density,
    valuePerKg,
    valuePerM3,
  };
};

const defaultPredictionLabDataset = {
  totalShipments: 0,
  lowRiskCount: 0,
  highRiskCount: 0,
  lowRiskShare: 0,
  highRiskShare: 0,
  averageTaxRatio: 0,
  averagePriceUsd: 0,
  averageWeightKg: 0,
  averageLengthM: 0,
  averageWidthM: 0,
  averageHeightM: 0,
  averageVolumeM3: 0,
  averageMaxDimensionM: 0,
  averageDimensionSumM: 0,
  averageDensityKgM3: 0,
  averageTaxUsd: 0,
  taxRatioQuartiles: {
    low: 0,
    median: 0,
    high: 0,
  },
  model: {
    name: "Neural Network",
    accuracy: 0,
    testRows: 0,
    decisionThreshold: 0,
  },
  topPorts: [],
  featuredSamples: [],
  comparisonSamples: [],
  labSamples: [],
};

function PredictionView() {
  const { labContext, loading: contextLoading, error: contextError } = useLabContext();
  const predictionLabDataset =
    labContext?.predictionLabDataset ?? defaultPredictionLabDataset;
  const [formData, setFormData] = useState(createInitialFormData());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");

  const geometry = useMemo(() => buildGeometrySummary(formData), [formData]);
  const { price, weight, volume, length, width, height, maxDimension, dimensionSum, density, valuePerKg, valuePerM3 } = geometry;
  const tax = Number(formData.tax);
  const taxRatioPreview = price > 0 ? Number((tax / price).toFixed(4)) : 0;
  const isHighRisk = result?.risk === "HIGH RISK";
  const riskScore = Math.round(Number(result?.confidence || 0) * 100);
  const topPortMaxCount = predictionLabDataset.topPorts?.[0]?.shipmentCount ?? 1;

  useEffect(() => {
    if (!predictionLabDataset?.topPorts?.[0]?.name) {
      return;
    }

    setFormData((current) =>
      current.destinationPort
        ? current
        : {
            ...current,
            destinationPort: predictionLabDataset.topPorts[0].name,
          }
    );
  }, [predictionLabDataset]);

  const allDatasetSamples = useMemo(
    () => [
      ...(predictionLabDataset?.featuredSamples ?? []),
      ...(predictionLabDataset?.comparisonSamples ?? []),
    ],
    [predictionLabDataset]
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
      predictionLabDataset?.topPorts?.find(
        (port) => port.name === formData.destinationPort
      ) ||
      predictionLabDataset?.topPorts?.[0] || {
        name: "No port selected",
        shipmentCount: 0,
      },
    [formData.destinationPort, predictionLabDataset]
  );

  const {
    averagePriceUsd,
    averageWeightKg,
    averageVolumeM3,
    averageLengthM,
    averageWidthM,
    averageHeightM,
    averageMaxDimensionM,
    averageDimensionSumM,
    averageDensityKgM3,
  } = predictionLabDataset;

  const keyFactors = useMemo(() => {
    const nextFactors = [];

    if (price > 0) {
      if (valuePerKg >= 1 && valuePerKg <= averagePriceUsd / Math.max(averageWeightKg, 1)) {
        nextFactors.push({
          title: "Strong value-to-weight ratio",
          detail: `${formatCompactCurrency(valuePerKg)} per kg compares well with the dataset average shipment profile.`,
          impact: "high",
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

    if (Number.isFinite(volume) && volume > 0) {
      nextFactors.push({
        title:
          volume >= averageVolumeM3
            ? "Larger volume profile"
            : "Compact volume profile",
        detail:
          volume >= averageVolumeM3
            ? `${volume.toFixed(4)} m3 is above the dataset average of ${averageVolumeM3.toFixed(4)} m3.`
            : `${volume.toFixed(4)} m3 is below the dataset average of ${averageVolumeM3.toFixed(4)} m3.`,
        impact: volume >= averageVolumeM3 ? "medium" : "low",
      });
    }

    if (Number.isFinite(length) || Number.isFinite(width) || Number.isFinite(height)) {
      nextFactors.push({
        title:
          maxDimension >= averageMaxDimensionM
            ? "Wide dimension profile"
            : "Compact dimension profile",
        detail:
          `${maxDimension.toFixed(3)} m max dimension and ${dimensionSum.toFixed(3)} m total span compare with the dataset averages of ${averageLengthM.toFixed(3)} x ${averageWidthM.toFixed(3)} x ${averageHeightM.toFixed(3)} m, max ${averageMaxDimensionM.toFixed(3)} m, and span ${averageDimensionSumM.toFixed(3)} m.`,
        impact: maxDimension >= averageMaxDimensionM ? "medium" : "low",
      });
    }

    if (density > 0) {
      nextFactors.push({
        title:
          density >= averageDensityKgM3
            ? "Dense shipment"
            : "Lighter shipment density",
        detail:
          density >= averageDensityKgM3
            ? `${density.toFixed(2)} kg/m3 is above the dataset average of ${averageDensityKgM3.toFixed(2)} kg/m3.`
            : `${density.toFixed(2)} kg/m3 is below the dataset average of ${averageDensityKgM3.toFixed(2)} kg/m3.`,
        impact: density >= averageDensityKgM3 ? "medium" : "low",
      });
    }

    nextFactors.push({
      title: "Destination port activity",
      detail: `${activePort.name} appears in ${formatNumber(activePort.shipmentCount)} processed shipments.`,
      impact: "low",
    });

    return nextFactors.slice(0, 4);
  }, [
    activePort,
    averageDimensionSumM,
    averageDensityKgM3,
    averageHeightM,
    averageLengthM,
    averageMaxDimensionM,
    averagePriceUsd,
    averageVolumeM3,
    averageWeightKg,
    averageWidthM,
    density,
    dimensionSum,
    height,
    length,
    maxDimension,
    price,
    valuePerKg,
    volume,
    weight,
    width,
  ]);

  const similarShipments = useMemo(() => {
    const rankedSamples = allDatasetSamples
      .map((sample) => ({
        ...sample,
        distance:
          Math.abs(sample.priceUsd - price) / Math.max(price, 1) +
          Math.abs(sample.weightKg - weight) / Math.max(weight, 1) +
          Math.abs(sample.volumeM3 - volume) / Math.max(volume, 0.0001) +
          Math.abs(sample.lengthM - length) +
          Math.abs(sample.widthM - width) +
          Math.abs(sample.heightM - height),
      }))
      .sort((left, right) => left.distance - right.distance);

    return rankedSamples.slice(0, 3);
  }, [allDatasetSamples, height, length, price, volume, weight, width]);

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

  if (contextLoading) {
    return (
      <div className="prediction-page">
        <section className="panel">
          <h3>Loading prediction lab...</h3>
          <p>Reading live dataset benchmarks and model context from the backend.</p>
        </section>
      </div>
    );
  }

  if (contextError || !predictionLabDataset) {
    return (
      <div className="prediction-page">
        <section className="panel">
          <h3>Prediction lab connection error</h3>
          <p>{contextError || "Live prediction context could not be loaded."}</p>
        </section>
      </div>
    );
  }

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
      length: String(sample.lengthM ?? ""),
      width: String(sample.widthM ?? ""),
      height: String(sample.heightM ?? ""),
      tax: String(sample.taxUsd),
    });
    setError("");
  };

  const handleReset = () => {
    setFormData(createInitialFormData(predictionLabDataset));
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

      if (!Number.isFinite(weight) || weight < 0) {
        throw new Error("Weight must be zero or greater.");
      }

      if (!Number.isFinite(volume) || volume <= 0) {
        throw new Error("Volume must be greater than zero.");
      }

      if (!Number.isFinite(length) || length < 0) {
        throw new Error("Length must be zero or greater.");
      }

      if (!Number.isFinite(width) || width < 0) {
        throw new Error("Width must be zero or greater.");
      }

      if (!Number.isFinite(height) || height < 0) {
        throw new Error("Height must be zero or greater.");
      }

      if (!Number.isFinite(tax) || tax < 0) {
        throw new Error("Tax must be zero or greater.");
      }

      const payload = {
        product_name: formData.productName.trim(),
        destination_port: formData.destinationPort,
        price_usd: price,
        price,
        weight_kg: weight,
        volume_m3: volume,
        length_m: length,
        width_m: width,
        height_m: height,
        max_dimension_m: maxDimension,
        dimension_sum_m: dimensionSum,
        density_kg_m3: density,
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
                  The live Neural Network predicts from invoice value, weight,
                  volume, and shipment dimensions. Tax still powers the dataset
                  comparison cards and saved prediction context.
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
                    {sample.weightKg.toFixed(2)} kg |{" "}
                    {sample.volumeM3.toFixed(4)} m3
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
                  <span>Length (m)</span>
                  <input
                    type="number"
                    name="length"
                    value={formData.length}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.001"
                    placeholder="Example: 0.45"
                  />
                </label>

                <label className="field">
                  <span>Width (m)</span>
                  <input
                    type="number"
                    name="width"
                    value={formData.width}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.001"
                    placeholder="Example: 0.30"
                  />
                </label>
              </div>

              <div className="prediction-form-grid">
                <label className="field">
                  <span>Height (m)</span>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.001"
                    placeholder="Example: 0.12"
                  />
                </label>

                <label className="field">
                  <span>Volume (m3)</span>
                  <input
                    type="number"
                    name="volume"
                    value={formData.volume}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.0001"
                    placeholder="Example: 0.1250"
                  />
                </label>
              </div>

              <div className="prediction-form-grid">
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

                <label className="field">
                  <span>Derived NN Signals</span>
                  <div className="prediction-derived-field">
                    <strong>{maxDimension.toFixed(3)}m max / {dimensionSum.toFixed(3)}m total</strong>
                    <small>
                      Density {density.toFixed(2)} kg/m3 | Value/kg {formatCompactCurrency(valuePerKg)} | Value/m3 {formatCompactCurrency(valuePerM3)}
                    </small>
                  </div>
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
                This page uses fields that exist in your shipment dataset:
                product name, destination port, price, weight, dimensions,
                volume, tax, and the derived risk behavior shown in the dataset.
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
                    ? "The score below comes from the active Neural Network endpoint and uses the shipment features entered in this form."
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
                <span>Entered Weight</span>
                <strong>{formData.weight ? `${Number(formData.weight).toFixed(2)} kg` : "-"}</strong>
              </div>

              <div className="summary-row">
                <span>Entered Volume</span>
                <strong>{formData.volume ? `${Number(formData.volume).toFixed(4)} m3` : "-"}</strong>
              </div>

              <div className="summary-row">
                <span>Dimensions</span>
                <strong>
                  {formData.length && formData.width && formData.height
                    ? `${Number(formData.length).toFixed(3)} x ${Number(formData.width).toFixed(3)} x ${Number(formData.height).toFixed(3)} m`
                    : "-"}
                </strong>
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
              Closest examples from the processed CSV based on price, weight,
              volume, and shipment dimensions.
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
                <span>{sample.weightKg.toFixed(2)} kg</span>
                <span>{sample.volumeM3.toFixed(4)} m3</span>
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
                      width: `${(port.shipmentCount / topPortMaxCount) * 100}%`,
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
                <th>Price</th>
                <th>Weight</th>
                <th>Volume</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="8">No prediction history available yet.</td>
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
                    <td>{item.input?.price_usd ?? item.input?.price ?? "-"}</td>
                    <td>{item.input?.weight_kg ?? "-"}</td>
                    <td>{item.input?.volume_m3 ?? "-"}</td>
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
