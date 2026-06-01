import { useEffect, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import StatCard from "../components/StatCard";
import { getAuthHeaders } from "../auth";

function toPercentNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number((number * 100).toFixed(2)) : 0;
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "—";
}

function normalizeFeatureName(value) {
  return String(value || "").replaceAll("_", " ");
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

function RandomForestModelPage() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadModelData() {
      try {
        const response = await fetch("/api/models/random-forest", {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Random Forest data could not be loaded.");
        }

        const data = await response.json();
        setModelData(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadModelData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Loading Random Forest model...</h3>
          <p>Reading Random Forest metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Random Forest connection error</h3>
          <p>{error}</p>
        </section>
      </div>
    );
  }

  const metrics = modelData?.metrics ?? null;

  if (!metrics) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Random Forest metrics not found</h3>
          <p>
            The backend is working, but no Random Forest metrics file was found
            in ml/models.
          </p>
        </section>
      </div>
    );
  }

  const accuracy = toPercentNumber(metrics.accuracy);
  const precision = toPercentNumber(metrics.precision);
  const recall = toPercentNumber(metrics.recall);
  const f1Score = toPercentNumber(metrics.f1_score);
  const baselineAccuracy = toPercentNumber(metrics.baseline_accuracy);

  const matrix = getMatrix(metrics);
  const featuresUsed = modelData?.features_used ?? metrics.features_used ?? [];
  const featureImportance = metrics.feature_importance ?? [];

  const cards = [
    {
      label: "Algorithm",
      value: metrics.model || "Random Forest",
      note: "Tree-based ensemble classifier",
    },
    {
      label: "Accuracy",
      value: `${accuracy.toFixed(2)}%`,
      note: "Without tax and tax_ratio",
    },
    {
      label: "F1 Score",
      value: `${f1Score.toFixed(2)}%`,
      note: "High-risk class performance",
    },
    {
      label: "Baseline Accuracy",
      value: `${baselineAccuracy.toFixed(2)}%`,
      note: "Majority-class benchmark",
    },
  ];

  const metricBars = [
    { label: "Accuracy", value: accuracy },
    { label: "Precision", value: precision },
    { label: "Recall", value: recall },
    { label: "F1 Score", value: f1Score },
    { label: "Baseline Accuracy", value: baselineAccuracy },
  ];

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

  const isBelowBaseline = accuracy < baselineAccuracy;

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Random Forest Dashboard</h1>
          <p>
            Performance summary for the Random Forest classifier trained without
            tax and tax_ratio, to avoid tax-related target leakage.
          </p>
        </div>

        <div className="status-pill">Live Backend Data</div>
      </header>

      <section className="cards">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            note={card.note}
          />
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Random Forest Metrics</h3>
              <p>
                Evaluation results after removing tax and tax_ratio from the
                model features.
              </p>
            </div>
          </div>

          <div className="metric-chart">
            {metricBars.map((metric) => (
              <ProgressBar
                key={metric.label}
                label={metric.label}
                value={metric.value}
              />
            ))}
          </div>
        </div>

        <div className="panel insight-panel">
          <div className="panel-header">
            <div>
              <h3>Model Interpretation</h3>
              <p>How this Random Forest result should be explained.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Leakage-controlled model</span>
            <strong>{isBelowBaseline ? "Below baseline" : "Above baseline"}</strong>
            <p>
              This Random Forest version excludes tax and tax_ratio. The result
              is lower than the majority-class baseline, which confirms that the
              earlier perfect performance was mainly driven by tax-related
              leakage, not by independent predictive patterns.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Confusion Matrix</h3>
              <p>
                Correct and incorrect predictions by actual and predicted risk
                class.
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
              <h3>Validation Reading</h3>
              <p>Why this result is useful even if the score is lower.</p>
            </div>
          </div>

          <div className="quality-dashboard-grid">
            <div>
              <span>Rows Used</span>
              <strong>{formatCount(metrics.rows_used)}</strong>
            </div>
            <div>
              <span>Test Rows</span>
              <strong>{formatCount(metrics.test_rows)}</strong>
            </div>
            <div>
              <span>Features</span>
              <strong>{featuresUsed.length}</strong>
            </div>
            <div>
              <span>Tax Features</span>
              <strong>Excluded</strong>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Key conclusion</span>
            <strong>No leakage features</strong>
            <p>
              Removing tax and tax_ratio makes the model more methodologically
              honest. It shows that the remaining shipment and value-density
              features are not enough to strongly identify HIGH RISK records.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Feature Importance</h3>
              <p>
                Most influential variables after excluding tax and tax_ratio.
              </p>
            </div>
          </div>

          <div className="metric-chart">
            {featureImportance.map((item) => (
              <ProgressBar
                key={item.feature}
                label={normalizeFeatureName(item.feature)}
                value={toPercentNumber(item.importance)}
              />
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Model Role</h3>
              <p>How Random Forest should be positioned in the project.</p>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Clean Data</span>
            <i />
            <span>No Tax Features</span>
            <i />
            <span>Random Forest</span>
            <i />
            <span>Validation</span>
          </div>

          <div className="model-notes">
            <p>
              Random Forest is useful here as a diagnostic model. It helps show
              whether model performance depends on leakage features. In the
              final interpretation, this page should emphasize model validity
              rather than only accuracy.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Features Used by Random Forest</h3>
            <p>
              Input variables included in the leakage-controlled Random Forest
              training and evaluation.
            </p>
          </div>
        </div>

        <div className="feature-chip-grid">
          {featuresUsed.map((feature) => (
            <span className="feature-chip" key={feature}>
              {normalizeFeatureName(feature)}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default RandomForestModelPage;