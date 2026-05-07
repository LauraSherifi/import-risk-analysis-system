import "./App.css";
import { NavLink, Route, Routes } from "react-router-dom";
import PredictionView from "./pages/PredictionView";

function AppLayout({ children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">🚢</div>
        <h2>Shipment Risk</h2>
        <p>Analysis System</p>

        <nav>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/predict" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            Prediction
          </NavLink>
        </nav>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}

function Dashboard() {
  return (
    <AppLayout>
      <header className="page-header">
        <div>
          <h1>Shipment Dataset Dashboard</h1>
          <p>Overview of the cleaned shipment data prepared for risk analysis.</p>
        </div>
        <div className="header-badge">Dataset Insights</div>
      </header>

      <section className="cards">
        <div className="card">
          <span>Total Shipments</span>
          <strong>263,821</strong>
          <small>Processed records available for model training.</small>
        </div>

        <div className="card">
          <span>Columns</span>
          <strong>8</strong>
          <small>Core shipment fields after cleaning and standardization.</small>
        </div>

        <div className="card">
          <span>Prediction Features</span>
          <strong>Tax-Based</strong>
          <small>The prediction pipeline currently relies on tax and tax ratio values.</small>
        </div>

        <div className="card">
          <span>Risk Output</span>
          <strong>2 Labels</strong>
          <small>Predictions are returned as either HIGH RISK or LOW RISK.</small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Dataset Snapshot</h3>
            <p>Quick summary of the information currently used across the dashboard and prediction flow.</p>
          </div>
        </div>

        <div className="snapshot-grid">
          <div className="snapshot-item">
            <span>Main Value Field</span>
            <strong>price_usd</strong>
          </div>
          <div className="snapshot-item">
            <span>Calculated Feature</span>
            <strong>tax_ratio</strong>
          </div>
          <div className="snapshot-item">
            <span>Prediction Inputs</span>
            <strong>Tax + Ratio</strong>
          </div>
          <div className="snapshot-item">
            <span>Prediction Result</span>
            <strong>Risk Label</strong>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}

function PredictionPage() {
  return (
    <AppLayout>
      <PredictionView />
    </AppLayout>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/predict" element={<PredictionPage />} />
    </Routes>
  );
}

export default App;
