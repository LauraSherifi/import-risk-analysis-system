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

function NeuralNetworkModelPage() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadModelData() {
      try {
        const response = await fetch("/api/models/neural-network", {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Neural Network data could not be loaded.");
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
          <h3>Loading Neural Network model...</h3>
          <p>Reading Neural Network metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Neural Network connection error</h3>
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
          <h3>Neural Network metrics not found</h3>
          <p>
            The backend is working, but no neural_network_metrics.json file was
            found in ml/models.
          </p>
        </section>
      </div>
    );
  }

  const accuracy = toPercentNumber(metrics.accuracy);
  const f1Score = toPercentNumber(metrics.f1_score);
  const matrix = getMatrix(metrics);
  const featuresUsed = modelData?.features_used ?? metrics.features_used ?? [];
  const tuningResults = modelData?.tuning_results ?? [];

  const cards = [
    {
      label: "Algorithm",
      value: "Neural Network",
      note: "Dense neural classifier",
    },
    {
      label: "Best Architecture",
      value: metrics.name || "—",
      note: "Selected from tuning results",
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
  ];

  const metricBars = [
    { label: "Accuracy", value: accuracy },
    { label: "F1 Score", value: f1Score },
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

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Neural Network Dashboard</h1>
          <p>
            Performance summary for the Neural Network model connected to live
            backend metrics.
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
              <h3>Neural Network Metrics</h3>
              <p>Evaluation results for the selected neural architecture.</p>
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
              <p>How this Neural Network result should be explained.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Best architecture</span>
            <strong>{metrics.name || "—"}</strong>
            <p>
              The Neural Network uses scaled numerical shipment features and
              selects the best architecture based on F1 Score and Accuracy.
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
              <h3>Training Configuration</h3>
              <p>Key parameters of the selected Neural Network model.</p>
            </div>
          </div>

          <div className="quality-dashboard-grid">
            <div>
              <span>Layers</span>
              <strong>{Array.isArray(metrics.layers) ? metrics.layers.join(" / ") : "—"}</strong>
            </div>
            <div>
              <span>Dropout</span>
              <strong>{metrics.dropout ?? "—"}</strong>
            </div>
            <div>
              <span>Learning Rate</span>
              <strong>{metrics.learning_rate ?? "—"}</strong>
            </div>
            <div>
              <span>Epochs Ran</span>
              <strong>{metrics.epochs_ran ?? "—"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Architecture Comparison</h3>
              <p>Neural Network architectures tested during training.</p>
            </div>
          </div>

          <div className="metric-chart">
            {tuningResults.map((item) => (
              <div key={item.name} className="model-notes">
                <p>
                  <strong>{item.name}</strong>
                </p>

                <ProgressBar
                  label="Accuracy"
                  value={toPercentNumber(item.accuracy)}
                />
                <ProgressBar
                  label="F1 Score"
                  value={toPercentNumber(item.f1_score)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Model Role</h3>
              <p>How Neural Network should be positioned in the project.</p>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Clean Data</span>
            <i />
            <span>Scale Features</span>
            <i />
            <span>Neural Network</span>
            <i />
            <span>Evaluation</span>
          </div>

          <div className="model-notes">
            <p>
              Neural Network is useful for learning non-linear relationships
              between shipment features. It is less interpretable than Decision
              Tree, but it can capture more complex patterns.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Features Used by Neural Network</h3>
            <p>Input variables included in Neural Network training.</p>
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

export default NeuralNetworkModelPage;