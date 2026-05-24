import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import "./App.css";

import Dashboard from "./pages/Dashboard";
import DatasetPage from "./pages/DatasetPage";
import PredictionView from "./pages/PredictionView";
import KNNModelPage from "./pages/KNNModelPage";
import { completedModelPages } from "./config/modelPages";
import PredictionHistoryPage from "./pages/PredictionHistoryPage";
import LogisticRegressionModelPage from "./pages/LogisticRegressionModelPage";

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🚢</div>
        <h2>Shipment Risk</h2>
        <p>Analysis System</p>

        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>

          <NavLink to="/dataset">
            Dataset
          </NavLink>

          <NavLink to="/prediction">
            Prediction
          </NavLink>

          <NavLink to="/prediction-history">
            Prediction History
          </NavLink>

          <div className="nav-section-title">Completed Models</div>

          {completedModelPages.map((model) => (
            <NavLink key={model.id} to={model.path}>
              {model.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dataset" element={<DatasetPage />} />
          <Route path="/prediction" element={<PredictionView />} />
          <Route path="/prediction-history" element={<PredictionHistoryPage />} />
          <Route path="/models/knn" element={<KNNModelPage />} />
          <Route path="/models/logistic-regression" element={<LogisticRegressionModelPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;