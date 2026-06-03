import { useEffect, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import StatCard from "../components/StatCard";
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

function normalizeFeatureName(value) {
  return String(value || "").replaceAll("_", " ");
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

function KNNModelPage() {
  const [knnData, setKnnData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadKnnData() {
      try {
        const response = await fetch("/api/models/knn", {
             headers: getAuthHeaders(),
                });

        if (!response.ok) {
          throw new Error("KNN model data could not be loaded.");
        }

        const data = await response.json();
        setKnnData(data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadKnnData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Loading KNN model...</h3>
          <p>Reading KNN metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>KNN connection error</h3>
          <p>{error}</p>
        </section>
      </div>
    );
  }

  const model = knnData?.latest ?? knnData?.demo ?? null;

  if (!model) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>KNN metrics not found</h3>
          <p>
            The backend is working, but no KNN metrics file was found in
            ml/models.
          </p>
        </section>
      </div>
    );
  }

  const accuracy = toPercentNumber(model.accuracy);
  const macroF1 = toPercentNumber(model.macro_f1);
  const weightedF1 = toPercentNumber(model.weighted_f1);
  const highRiskPrecision = toPercentNumber(
    getHighRiskMetric(model, "precision")
  );
  const highRiskRecall = toPercentNumber(getHighRiskMetric(model, "recall"));
  const highRiskF1 = toPercentNumber(getHighRiskMetric(model, "f1-score"));

  const matrix = getMatrix(model);

  const cards = [
    {
      label: "Algorithm",
      value: model.model || "KNN",
      note: "Completed classifier",
    },
    {
      label: "Accuracy",
      value: `${accuracy.toFixed(2)}%`,
      note: "Overall model performance",
    },
    {
      label: "Macro F1",
      value: `${macroF1.toFixed(2)}%`,
      note: "Balanced class performance",
    },
    {
      label: "Weighted F1",
      value: `${weightedF1.toFixed(2)}%`,
      note: "Weighted by class support",
    },
  ];

  const metrics = [
    { label: "Accuracy", value: accuracy },
    { label: "Macro F1", value: macroF1 },
    { label: "Weighted F1", value: weightedF1 },
    { label: "High-risk Precision", value: highRiskPrecision },
    { label: "High-risk Recall", value: highRiskRecall },
    { label: "High-risk F1", value: highRiskF1 },
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

  const featureList = model.features_used ?? [];

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>KNN Model Dashboard</h1>
          <p>
            Performance summary for the completed KNN shipment risk classifier,
            using metrics loaded directly from the backend.
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
              <h3>KNN Performance Metrics</h3>
              <p>
                Main evaluation results for the current KNN model metrics file.
              </p>
            </div>
          </div>

          <div className="metric-chart">
            {metrics.map((metric) => (
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
              <p>How the current KNN result should be read.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Current KNN Status</span>
            <strong>{accuracy.toFixed(2)}%</strong>
            <p>
              KNN is currently the strongest completed classifier in the system.
              Since the risk label is simulated, the result should be described
              as prototype model performance, not as confirmed real-world fraud
              detection accuracy.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>KNN Confusion Matrix</h3>
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
              <h3>Training and Testing Setup</h3>
              <p>Model evaluation structure from the KNN metrics file.</p>
            </div>
          </div>

          <div className="quality-dashboard-grid">
            <div>
              <span>Rows Used</span>
              <strong>{formatCount(model.rows_used)}</strong>
            </div>
            <div>
              <span>Test Rows</span>
              <strong>{formatCount(model.test_rows)}</strong>
            </div>
            <div>
              <span>Features</span>
              <strong>{formatCount(featureList.length)}</strong>
            </div>
            <div>
              <span>Model</span>
              <strong>{model.model || "KNN"}</strong>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Clean Data</span>
            <i />
            <span>Feature Set</span>
            <i />
            <span>KNN Training</span>
            <i />
            <span>Evaluation</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Features Used by KNN</h3>
            <p>
              Input variables included in the current KNN model training and
              evaluation.
            </p>
          </div>
        </div>

        <div className="feature-chip-grid">
          {featureList.map((feature) => (
            <span className="feature-chip" key={feature}>
              {normalizeFeatureName(feature)}
            </span>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Version Note</h3>
            <p>Temporary handling of KNN model versions.</p>
          </div>
        </div>

        <div className="highlight-insight">
          <span>Current display logic</span>
          <strong>Latest KNN only</strong>
          <p>
            The backend is ready to support demo/check versions later, but this
            page currently displays only the latest KNN metrics. Demo and check
            versions can be added after feedback from the team.
          </p>
        </div>
      </section>
    </div>
  );
}

export default KNNModelPage;