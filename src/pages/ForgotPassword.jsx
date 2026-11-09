
import { useState } from "react";
import { Link } from "react-router-dom";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your registered email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to process your request."
        );
      }

      setEmail(normalizedEmail);
      setStep(2);
      setMessage(
        data?.message ||
        "If an eligible account exists, a reset code has been sent."
      );

    } catch (requestError) {
      setError(
        requestError.message ||
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the valid 6-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to reset password."
        );
      }

      setMessage(
        data?.message || "Password reset successfully."
      );

      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setStep(3);

    } catch (resetError) {
      setError(
        resetError.message ||
        "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">🔐</div>

        {step === 1 && (
          <>
            <h1>Forgot Password?</h1>

            <p className="auth-subtitle">
              Enter your registered email address to receive a password reset code.
            </p>

            <form onSubmit={handleRequestOtp}>
              <label htmlFor="reset-email">
                Email Address
              </label>

              <input
                id="reset-email"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                required
              />

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
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Reset Password</h1>

            <p className="auth-subtitle">
              Enter the 6-digit code sent to {email}.
            </p>

            <form onSubmit={handleResetPassword}>
              <label htmlFor="reset-otp">
                Verification Code
              </label>

              <input
                id="reset-otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                required
              />

              <label htmlFor="new-password">
                New Password
              </label>

              <div className="password-field-wrap">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <div className="password-field-wrap">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                >
                  {showConfirmPassword ? "Hide" : "Show"}
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
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>

            <button
              type="button"
              className="back-home"
              onClick={() => {
                setStep(1);
                setError("");
                setMessage("");
              }}
            >
              Change Email Address
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Password Reset!</h1>

            <p className="auth-subtitle">
              Your password has been changed successfully. You can now log in using your new password.
            </p>

            <Link to="/login" className="auth-btn">
              Go to Login
            </Link>
          </>
        )}

        {message && step !== 3 && (
          <p style={{ color: "#16a34a", fontSize: "14px" }}>
            {message}
          </p>
        )}

        {step !== 3 && (
          <Link to="/login" className="back-home">
            ← Back to Login
          </Link>
        )}

      </div>
    </div>
  );
}

export default ForgotPassword;
