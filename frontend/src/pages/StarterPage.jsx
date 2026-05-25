import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import starterShip from "../assets/starter-port.png";
import brandLogo from "../assets/brand-logo.png";
import { useAuth } from "../components/AuthProvider";

function StarterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEnter = adminId.trim().length > 1 && password.trim().length > 1;

  const targetPath = location.state?.from || "/app/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, navigate, targetPath]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!canEnter) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await login({
        adminId: adminId.trim(),
        password,
      });

      setIsLoginOpen(false);
      navigate(targetPath, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="starter-page">
      <section
        className="starter-layout"
        style={{
          "--starter-ship": `url(${starterShip})`,
        }}
      >
        <div className="starter-content">
          <div className="starter-copy-block">
            <div className="starter-brand-row">
              <img className="starter-brand-logo" src={brandLogo} alt="Import Risk Analysis System logo" />
              <span className="brand-chip">Client Access Portal</span>
            </div>
            <p className="starter-eyebrow">Private Client Platform</p>
            <h1>Import Risk Analysis System</h1>
            <p className="starter-description">
              A secure shipment intelligence workspace for monitoring trade activity,
              identifying suspicious import patterns, and supporting better risk decisions.
            </p>

            <div className="starter-actions">
              <button
                className="primary-button hero-button"
                type="button"
                onClick={() => {
                  setError("");
                  setIsLoginOpen(true);
                }}
              >
                Admin Login
              </button>
              <p className="starter-access-note">Authorized client access only</p>
            </div>
          </div>
        </div>
      </section>

      {isLoginOpen && (
        <div className="login-modal-backdrop" onClick={() => setIsLoginOpen(false)}>
          <div
            className="login-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-login-title"
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setIsLoginOpen(false)}
              aria-label="Close login"
            >
              x
            </button>

            <div className="login-modal-header">
              <p className="login-kicker">Restricted Access</p>
              <h2 id="admin-login-title">Admin Login</h2>
              <p className="login-copy">
                Sign in to access shipment dashboards,
                <br />
                prediction tools, and client reporting.
              </p>
            </div>

            <form className="starter-form compact-login-form" onSubmit={handleLogin}>
              <label className="field">
                <span>Account</span>
                <input
                  type="text"
                  value={adminId}
                  onChange={(event) => setAdminId(event.target.value)}
                  placeholder="Enter account"
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                />
              </label>

              <button className="primary-button login-button" type="submit" disabled={!canEnter}>
                {isSubmitting ? "Signing In..." : "Access Dashboard"}
              </button>
            </form>

            {error && <p className="login-error">{error}</p>}
            <p className="login-helper-text">
              Secure client-only access to the import risk workspace.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StarterPage;
