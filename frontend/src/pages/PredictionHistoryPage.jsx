import { useEffect, useState } from "react";
import { getAuthHeaders } from "../auth";

function PredictionHistoryPage() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
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
      } catch (err) {
        setError(err.message);
      }
    };

    loadPredictionHistory();
  }, []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Prediction History</h1>
          <p>
            Overview of recent risk predictions generated through the completed
            ML prediction service.
          </p>
        </div>

        <div className="status-pill">Backend Connected</div>
      </header>

      {error && (
        <section className="panel">
          <div className="prediction-result error">
            <span>Connection Error</span>
            <strong>{error}</strong>
          </div>
        </section>
      )}

      <section className="cards">
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
        </div>

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
}

export default PredictionHistoryPage;
