import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { completedModelPages } from "../config/modelPages";
import brandLogo from "../assets/brand-logo.png";
import { useAuth } from "./AuthProvider";
import AIAssistantWidget from "./AIAssistantWidget";

function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 900px)");

    const applyInitialState = () => {
      setIsSidebarOpen(!mobileQuery.matches);
    };

    applyInitialState();

    const handleChange = (event) => {
      setIsSidebarOpen(!event.matches);
    };

    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener("change", handleChange);
    } else {
      mobileQuery.addListener(handleChange);
    }

    return () => {
      if (mobileQuery.removeEventListener) {
        mobileQuery.removeEventListener("change", handleChange);
      } else {
        mobileQuery.removeListener(handleChange);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className={`app-shell ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      <button
        type="button"
        className="sidebar-toggle sidebar-toggle-mobile"
        onClick={() => setIsSidebarOpen((current) => !current)}
        aria-expanded={isSidebarOpen}
        aria-controls="app-sidebar"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <span className="sidebar-toggle-icon" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className="sidebar" id="app-sidebar">
        <div className="sidebar-brand">
          <div className="logo">
            <img src={brandLogo} alt="Import Risk Analysis System logo" />
          </div>
          <div className="sidebar-brand-copy">
            <h2>Import Risk</h2>
            <p>Analysis System</p>
          </div>
        </div>

        <div className="sidebar-summary">
          <span className="sidebar-kicker">Authenticated Session</span>
          <strong>{session?.adminId || "Admin access"}</strong>
        </div>

        <nav>
          <NavLink to="/app/dashboard">Dashboard</NavLink>
          <NavLink to="/app/dataset">Dataset</NavLink>
          <NavLink to="/app/prediction">Prediction</NavLink>
          <NavLink to="/app/testing-lab">Mini Testing Lab</NavLink>
          <NavLink to="/app/risk-map">Risk Map</NavLink>

          <div className="nav-section-title">Completed Models</div>

          {completedModelPages.map((model) => (
            <NavLink key={model.id} to={`/app${model.path}`}>
              {model.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="sidebar-logout"
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
        >
          Log Out
        </button>
      </aside>

      <main className="main">
        <div key={location.pathname} className="page-transition-shell">
          <Outlet />
        </div>
      </main>

      <AIAssistantWidget pathname={location.pathname} />

      {isLogoutModalOpen && (
        <div
          className="logout-modal-backdrop"
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div
            className="logout-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsLogoutModalOpen(false)}
              aria-label="Close logout confirmation"
            >
              x
            </button>

            <p className="login-kicker">Confirm Action</p>
            <h2 id="logout-confirm-title">Log Out</h2>
            <p className="login-copy">
              Are you sure you want to end the current admin session and return to the starter page?
            </p>

            <div className="logout-modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancel
              </button>
              <button className="primary-button" type="button" onClick={handleLogout}>
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppShell;
