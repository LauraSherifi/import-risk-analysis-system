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

function LogisticRegressionModelPage() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadModelData() {
      try {
        const response = await fetch("/api/models/logistic-regression", {
             headers: getAuthHeaders(),
             });

        if (!response.ok) {
          throw new Error("Logistic Regression data could not be loaded.");
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
          <h3>Loading Logistic Regression model...</h3>
          <p>Reading model metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Logistic Regression connection error</h3>
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
          <h3>Logistic Regression metrics not found</h3>
          <p>
            The backend is working, but no Logistic Regression metrics file was
            found in ml/models.
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
  const cvF1Mean = toPercentNumber(metrics.cv_f1_mean);
  const cvF1Std = toPercentNumber(metrics.cv_f1_std);

  const matrix = getMatrix(metrics);
  const featuresUsed = modelData?.features_used ?? [];

  const cards = [
    {
      label: "Algorithm",
      value: "Logistic Regression",
      note: "Completed benchmark classifier",
    },
    {
      label: "Accuracy",
      value: `${accuracy.toFixed(2)}%`,
      note: "Overall model performance",
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
    { label: "CV F1 Mean", value: cvF1Mean },
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

  const bestParams = metrics.best_params ?? {};

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Logistic Regression Dashboard</h1>
          <p>
            Performance summary for the completed Logistic Regression shipment
            risk classifier, loaded directly from backend model metrics.
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
              <h3>Logistic Regression Metrics</h3>
              <p>Main evaluation results from the backend metrics file.</p>
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
              <p>How this model should be read in the final interface.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Benchmark model</span>
            <strong>{accuracy.toFixed(2)}%</strong>
            <p>
              Logistic Regression is useful as a transparent and interpretable
              benchmark. However, its accuracy is below the majority-class
              baseline, meaning it should not be presented as the strongest
              operational model.
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
              <h3>Benchmark Comparison</h3>
              <p>Comparison against the simple majority-class baseline.</p>
            </div>
          </div>

          <div className="quality-dashboard-grid">
            <div>
              <span>Model Accuracy</span>
              <strong>{accuracy.toFixed(2)}%</strong>
            </div>
            <div>
              <span>Baseline Accuracy</span>
              <strong>{baselineAccuracy.toFixed(2)}%</strong>
            </div>
            <div>
              <span>CV F1 Mean</span>
              <strong>{cvF1Mean.toFixed(2)}%</strong>
            </div>
            <div>
              <span>CV F1 Std</span>
              <strong>{cvF1Std.toFixed(2)}%</strong>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Key reading</span>
            <strong>Below baseline</strong>
            <p>
              The majority-class baseline is higher than the Logistic Regression
              accuracy, so this model is best used for methodological comparison
              and interpretability, not as the final best model.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Best Parameters</h3>
              <p>Hyperparameters selected during model training.</p>
            </div>
          </div>

          <div className="quality-dashboard-grid">
            <div>
              <span>C</span>
              <strong>{bestParams.classifier__C ?? "—"}</strong>
            </div>
            <div>
              <span>Class Weight</span>
              <strong>{bestParams.classifier__class_weight ?? "—"}</strong>
            </div>
            <div>
              <span>Solver</span>
              <strong>{bestParams.classifier__solver ?? "—"}</strong>
            </div>
            <div>
              <span>Model Type</span>
              <strong>Linear</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Model Role</h3>
              <p>Why Logistic Regression is still useful in the project.</p>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Clean Data</span>
            <i />
            <span>Feature Set</span>
            <i />
            <span>Logistic Model</span>
            <i />
            <span>Benchmark</span>
          </div>

          <div className="model-notes">
            <p>
              Logistic Regression provides a simple, explainable comparison
              point against more flexible models. Its weaker performance helps
              justify why KNN is currently presented as the stronger completed
              classifier.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Features Used by Logistic Regression</h3>
            <p>
              Input variables included in the Logistic Regression training and
              evaluation.
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

export default LogisticRegressionModelPage;