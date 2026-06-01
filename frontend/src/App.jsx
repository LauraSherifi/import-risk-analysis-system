import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import DatasetPage from "./pages/DatasetPage";
import PredictionView from "./pages/PredictionView";
import RiskMapPage from "./pages/RiskMapPage";
import KNNModelPage from "./pages/KNNModelPage";
import LogisticRegressionModelPage from "./pages/LogisticRegressionModelPage";
import NeuralNetworkModelPage from "./pages/NeuralNetworkModelPage";
import RandomForestModelPage from "./pages/RandomForestModelPage";
import MiniTestingLabPage from "./pages/MiniTestingLabPage";
import StarterPage from "./pages/StarterPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<StarterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="dataset" element={<DatasetPage />} />
          <Route path="prediction" element={<PredictionView />} />
          <Route path="testing-lab" element={<MiniTestingLabPage />} />
          <Route path="risk-map" element={<RiskMapPage />} />
          <Route path="models/knn" element={<KNNModelPage />} />
          <Route path="models/logistic-regression" element={<LogisticRegressionModelPage />} />
          <Route path="models/neural-network" element={<NeuralNetworkModelPage />} />
          <Route path="models/random-forest" element={<RandomForestModelPage />} />
          </Route>
      </Route>

      <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/dataset" element={<Navigate to="/app/dataset" replace />} />
      <Route path="/prediction" element={<Navigate to="/app/prediction" replace />} />
      <Route path="/testing-lab" element={<Navigate to="/app/testing-lab" replace />} />
      <Route path="/prediction-history" element={<Navigate to="/app/prediction" replace />} />
      <Route path="/risk-map" element={<Navigate to="/app/risk-map" replace />} />
      <Route path="/models/knn" element={<Navigate to="/app/models/knn" replace />} />
      <Route path="/models/logistic-regression" element={<Navigate to="/app/models/logistic-regression" replace />} />
      <Route path="/models/neural-network" element={<Navigate to="/app/models/neural-network" replace />} />
      <Route path="/models/random-forest" element={<Navigate to="/app/models/random-forest" replace />} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
