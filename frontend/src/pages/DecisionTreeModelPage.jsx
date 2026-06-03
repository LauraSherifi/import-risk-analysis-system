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

function DecisionTreeModelPage() {
  const [modelData, setModelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadModelData() {
      try {
        const response = await fetch("/api/models/decision-tree", {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Decision Tree data could not be loaded.");
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
          <h3>Loading Decision Tree model...</h3>
          <p>Reading Decision Tree metrics from the backend.</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <section className="panel">
          <h3>Decision Tree connection error</h3>
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
          <h3>Decision Tree metrics not found</h3>
          <p>
            The backend is working, but no Decision Tree metrics file was found
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
  const criterionResults = metrics.criterion_results ?? [];

  const topFeature = featureImportance?.[0]?.feature ?? "—";
  const topFeatureImportance = toPercentNumber(
    featureImportance?.[0]?.importance ?? 0
  );

  const cards = [
    {
      label: "Algorithm",
      value: metrics.model || "Decision Tree",
      note: "Interpretable tree classifier",
    },
    {
      label: "Best Criterion",
      value: String(metrics.criterion || "—").toUpperCase(),
      note: "Selected from Gini, Entropy, and Log Loss",
    },
    {
      label: "Accuracy",
      value: `${accuracy.toFixed(2)}%`,
      note: "Final model without PCA",
    },
    {
      label: "F1 Score",
      value: `${f1Score.toFixed(2)}%`,
      note: "High-risk class performance",
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

  const taxFeatureDominates =
    topFeature === "tax_ratio_band" ||
    topFeature === "tax_band" ||
    topFeature === "tax_ratio" ||
    topFeature === "tax";

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Decision Tree Dashboard</h1>
          <p>
            Performance summary for the final Decision Tree classifier trained
            without PCA, using transformed tax-related variables.
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
              <h3>Decision Tree Metrics</h3>
              <p>
                Evaluation results for the selected Decision Tree model without
                PCA.
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
              <p>How this Decision Tree result should be explained.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Final selected approach</span>
            <strong>Without PCA</strong>
            <p>
              PCA was tested, but it was not selected for the final Decision
              Tree model because it produced unstable results. The final model
              uses tax_band and tax_ratio_band instead of raw tax and tax_ratio.
            </p>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Criterion Comparison</h3>
              <p>
                Decision Tree was tested using Gini, Entropy, and Log Loss.
              </p>
            </div>
          </div>

          <div className="metric-chart">
            {criterionResults.map((item) => (
              <div key={item.criterion} className="model-notes">
                <p>
                  <strong>{String(item.criterion).toUpperCase()}</strong>
                </p>

                <ProgressBar
                  label="Accuracy"
                  value={toPercentNumber(item.accuracy)}
                />
                <ProgressBar
                  label="Precision"
                  value={toPercentNumber(item.precision)}
                />
                <ProgressBar
                  label="Recall"
                  value={toPercentNumber(item.recall)}
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
              <span>Features</span>
              <strong>{featuresUsed.length}</strong>
            </div>
            <div>
              <span>Top Feature</span>
              <strong>{normalizeFeatureName(topFeature)}</strong>
            </div>
          </div>

          <div className="highlight-insight">
            <span>Top feature importance</span>
            <strong>{topFeatureImportance.toFixed(2)}%</strong>
            <p>
              The most influential feature is {normalizeFeatureName(topFeature)}.
              This shows that the Decision Tree relies strongly on transformed
              tax-related patterns.
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
              <h3>Feature Importance</h3>
              <p>
                Most influential variables used by the final Decision Tree
                model.
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
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>Model Role</h3>
              <p>How Decision Tree should be positioned in the project.</p>
            </div>
          </div>

          <div className="mini-pipeline">
            <span>Clean Data</span>
            <i />
            <span>Tax Bands</span>
            <i />
            <span>Decision Tree</span>
            <i />
            <span>Interpretation</span>
          </div>

          <div className="model-notes">
            <p>
              Decision Tree is useful because it is easier to explain than more
              complex models. The model was trained without PCA, while Gini,
              Entropy, and Log Loss were compared as splitting criteria.
            </p>

            <p>
              The final selected criterion is{" "}
              <strong>{String(metrics.criterion || "—").toUpperCase()}</strong>.
            </p>
          </div>
        </div>

        <div className="panel insight-panel">
          <div className="panel-header">
            <div>
              <h3>Tax Signal Reading</h3>
              <p>How tax-related variables affect interpretation.</p>
            </div>
          </div>

          <div className="highlight-insight">
            <span>{taxFeatureDominates ? "Tax-band driven" : "Mixed drivers"}</span>
            <strong>{normalizeFeatureName(topFeature)}</strong>
            <p>
              Because the top feature is transformed into a band, the model is
              less dependent on raw tax thresholds, but the result should still
              be interpreted as strongly related to tax behavior.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Features Used by Decision Tree</h3>
            <p>
              Input variables included in the final Decision Tree training and
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

export default DecisionTreeModelPage;