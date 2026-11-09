
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "./Login.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message || "Incorrect email or password."
        );
      }

      if (!responseData?.token || !responseData?.role) {
        throw new Error(
          "The server returned an invalid login response."
        );
      }

      const token = responseData.token;
      const role = responseData.role.toUpperCase();

      sessionStorage.setItem("carequeue-auth-token", token);

      if (role === "ADMIN") {
        sessionStorage.removeItem("carequeue-current-patient");

        sessionStorage.setItem(
          "carequeue-current-admin",
          responseData.email
        );

        navigate("/admin-dashboard", {
          replace: true,
        });

        return;
      }

      if (role !== "PATIENT") {
        throw new Error("This account has an unsupported role.");
      }

      sessionStorage.removeItem("carequeue-current-admin");

      sessionStorage.setItem(
        "carequeue-current-patient",
        responseData.email
      );

      let profile = {
        id: null,
        email: responseData.email,
        name: responseData.name,
        role: responseData.role,
      };

      try {
        const profileResponse = await fetch(
          `${API_BASE_URL}/api/auth/me`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (profileResponse.ok) {
          profile = await profileResponse.json();
        } else {
          console.warn(
            "Unable to retrieve the complete patient profile."
          );
        }
      } catch (profileError) {
        console.warn(
          "Patient profile request failed:",
          profileError
        );
      }

      localStorage.setItem(
        `carequeue-profile-${responseData.email}`,
        JSON.stringify({
          ...profile,
          photo: profile.profilePhotoData || "",
        })
      );

      navigate("/patient-dashboard", {
        replace: true,
      });

    } catch (loginError) {
      setError(
        loginError.message ||
        "Unable to connect to the login server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🏥</div>

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">
          Login to manage your hospital queue
        </p>

        <form onSubmit={handleLogin}>
          <label htmlFor="patient-email">
            Email Address
          </label>

          <input
            id="patient-email"
            type="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />

          <label htmlFor="patient-password">
            Password
          </label>

          <div className="password-field-wrap">
            <input
              id="patient-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              className="password-icon-toggle"
              onClick={() =>
                setShowPassword((value) => !value)
              }
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>

          <div className="forgot-password-link">
            <Link to="/forgot-password">
              Forgot Password?
            </Link>
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
            {loading ? "Checking..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/register">
            Create Account
          </Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Login;
