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

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function normalizeFeatureName(value) {
  return String(value || "").replaceAll("_", " ");
}

function getMatrix(metrics) {
  const confusionMatrix = metrics?.confusion_matrix;

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

function SVMModelPage() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadModelData() {
      try {
        const response = await fetch("/api/models/svm", {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("SVM data could not be loaded.");
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
          <h3>Loading SVM model...</h3>
          <p>Reading SVM metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>SVM connection error</h3>
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
          <h3>SVM metrics not found</h3>
          <p>
            The backend is working, but no svm_metrics.json file was found in ml/models.
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
  const validationPrecision = toPercentNumber(metrics.validation_precision);
  const validationRecall = toPercentNumber(metrics.validation_recall);
  const validationF1 = toPercentNumber(metrics.validation_f1);

  const matrix = getMatrix(metrics);
  const featuresUsed = modelData?.features_used ?? metrics.features_used ?? [];
  const bestParams = metrics.best_params ?? {};
  const decisionThreshold = metrics.decision_threshold;

  const cards = [
    {
      label: "Algorithm",
      value: metrics.model || "SVM",
      note: "Support Vector Machine classifier",
    },
    {
      label: "Accuracy",
      value: `${accuracy.toFixed(2)}%`,
      note: "Final evaluation score",
    },
    {
      label: "F1 Score",
      value: `${f1Score.toFixed(2)}%`,
      note: "High-risk class balance",
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

  const isBelowBaseline = accuracy < baselineAccuracy;

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>SVM Model Dashboard</h1>
          <p>
            Performance summary for the Support Vector Machine classifier trained
            on shipment features and connected directly to the backend metrics.
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
              <h3>SVM Metrics</h3>
              <p>Main evaluation results for the selected SVM model.</p>
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
              <p>How this SVM result should be explained.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Decision threshold</span>
            <strong>{formatMetricValue(decisionThreshold)}</strong>
            <p>
              The SVM is tuned to catch risky shipments aggressively, which gives
              it very high recall but much weaker precision. That means it should
              be presented as a caution-heavy model, not the best balanced one.
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
              <p>Important context for reading this model.</p>
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
              <span>Validation Precision</span>
              <strong>{validationPrecision.toFixed(2)}%</strong>
            </div>
            <div>
              <span>Validation Recall</span>
              <strong>{validationRecall.toFixed(2)}%</strong>
            </div>
          </div>

          <div className="highlight-insight">
            <span>{isBelowBaseline ? "Below baseline" : "Above baseline"}</span>
            <strong>{validationF1.toFixed(2)}%</strong>
            <p>
              This SVM prioritizes catching high-risk cases, but the current
              result is still weaker than the majority-class baseline in overall
              accuracy. It is useful for analysis, but not the best final model.
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
              <strong>{formatMetricValue(bestParams.classifier__C)}</strong>
            </div>
            <div>
              <span>Class Weight</span>
              <strong>{formatMetricValue(bestParams.classifier__class_weight)}</strong>
            </div>
            <div>
              <span>Kernel</span>
              <strong>{formatMetricValue(bestParams.classifier__kernel)}</strong>
            </div>
            <div>
              <span>Gamma</span>
              <strong>{formatMetricValue(bestParams.classifier__gamma)}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Model Role</h3>
              <p>How SVM should be positioned in the project.</p>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Clean Data</span>
            <i />
            <span>Feature Set</span>
            <i />
            <span>SVM Training</span>
            <i />
            <span>Evaluation</span>
          </div>

          <div className="model-notes">
            <p>
              SVM is strong at boundary-focused classification, which explains
              its extreme recall in this dataset. It is useful when the project
              wants to minimize missed risky shipments, even if it creates many
              false alarms.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Features Used by SVM</h3>
            <p>Input variables included in SVM training and evaluation.</p>
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

export default SVMModelPage;
