
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

const ADMIN_SESSION_KEY = "carequeue-current-admin";
const AUTH_TOKEN_KEY = "carequeue-auth-token";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    const cleanedEmail = email.trim().toLowerCase();

    if (!cleanedEmail || !password) {
      setError("Enter your admin email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: cleanedEmail,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Invalid email or password."
        );
      }

      if (!data?.token) {
        throw new Error("Login response did not contain an authentication token.");
      }

      if (String(data.role).toUpperCase() !== "ADMIN") {
        throw new Error("This account does not have administrator access.");
      }

      // Clear any previous session before creating the new Admin session.
      sessionStorage.removeItem("carequeue-current-patient");

      // Store the JWT token required by protected backend endpoints.
      sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);

      // Store the Admin email required by frontend route protection.
      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        data.email || cleanedEmail
      );

      navigate("/admin-dashboard", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err);
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🏥</div>

        <h1>Admin Login</h1>

        <p className="auth-subtitle">
          Sign in to manage the hospital queue
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="admin-email">Admin Email</label>

          <input
            id="admin-email"
            type="email"
            placeholder="Enter admin email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
            disabled={loading}
          />

          <label htmlFor="admin-password">Password</label>

          <div className="password-field-wrap">
            <input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              disabled={loading}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="registration-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login as Admin"}
          </button>
        </form>

        <button
          type="button"
          className="back-home"
          onClick={() => navigate("/")}
          style={{
            border: "none",
            background: "none",
            cursor: loading ? "not-allowed" : "pointer",
            width: "100%",
          }}
          disabled={loading}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}

export default AdminLogin;
