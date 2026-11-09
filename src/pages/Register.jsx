
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "./Login.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    age: "",
    gender: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email verification states
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    setPhotoError("");
    setPhoto("");

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setPhotoError(
        "Please select a JPG, PNG, WEBP or GIF image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setPhotoError(
        "Photo must be smaller than 1.5 MB."
      );
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhoto(reader.result);
    };

    reader.onerror = () => {
      setPhotoError(
        "Unable to read the selected photo."
      );
    };

    reader.readAsDataURL(file);
  };

  // Step 1: Register patient
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const age = Number(formData.age);
    const gender = formData.gender;

    if (
      !name ||
      !email ||
      !phone ||
      !address ||
      !gender ||
      !formData.age
    ) {
      setError(
        "Please complete all required personal details."
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^\+?[0-9\s-]{7,15}$/.test(phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError("Please enter a valid age.");
      return;
    }

    if (
      formData.password.length < 8 ||
      formData.password.length > 72
    ) {
      setError(
        "Password must contain between 8 and 72 characters."
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        name,
        email,
        phone,
        address,
        age,
        gender,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        profilePhotoData: photo || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationData),
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
          `Registration failed (${response.status}).`
        );
      }

      // Registration successful. Ask patient to verify email.
      setOtpStep(true);
      setOtp("");
      setError("");

    } catch (registrationError) {
      setError(
        registrationError.message ||
        "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify email OTP
  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError("");

    const email = formData.email.trim().toLowerCase();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/verify-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp: otp.trim(),
          }),
        }
      );

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
          "Invalid or expired OTP. Please try again."
        );
      }

      // Email verified. Redirect to login.
      navigate("/login", {
        replace: true,
        state: {
          verifiedEmail: email,
        },
      });

    } catch (verificationError) {
      setError(
        verificationError.message ||
        "Unable to verify your email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // OTP verification screen
  if (otpStep) {
    return (
      <div className="auth-page">
        <div className="auth-card register-card">
          <div className="auth-logo">🏥</div>

          <h1>Verify Your Email</h1>

          <p className="auth-subtitle">
            We've sent a 6-digit verification code to
          </p>

          <p
            style={{
              textAlign: "center",
              fontWeight: "600",
              marginBottom: "24px",
              color: "#5541a8",
              wordBreak: "break-word",
            }}
          >
            {formData.email.trim().toLowerCase()}
          </p>

          <form onSubmit={handleVerifyOtp}>
            <label htmlFor="verification-otp">
              Enter Verification Code
            </label>

            <input
              id="verification-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(event) =>
                setOtp(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              maxLength={6}
              required
              style={{
                textAlign: "center",
                fontSize: "22px",
                letterSpacing: "8px",
                fontWeight: "600",
              }}
            />

            {error && (
              <p className="registration-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <p className="auth-footer">
            Already verified?{" "}
            <Link to="/login">Login</Link>
          </p>

          <button
            type="button"
            className="back-home"
            onClick={() => {
              setOtpStep(false);
              setOtp("");
              setError("");
            }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            ← Back to Registration
          </button>
        </div>
      </div>
    );
  }

  // Registration screen
  return (
    <div className="auth-page">
      <div className="auth-card register-card">
        <div className="auth-logo">🏥</div>

        <h1>Create Account</h1>

        <p className="auth-subtitle">
          Register with CareQueue and manage your hospital visits.
        </p>

        <form onSubmit={handleSubmit}>
          <h3 className="registration-section-title">
            Account Information
          </h3>

          <label htmlFor="register-email">
            Email Address *
          </label>

          <input
            id="register-email"
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />

          <label htmlFor="register-password">
            Password *
          </label>

          <div className="password-field-wrap">
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
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

          <label htmlFor="register-confirm-password">
            Confirm Password *
          </label>

          <div className="password-field-wrap">
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              className="password-icon-toggle"
              onClick={() =>
                setShowConfirmPassword((value) => !value)
              }
              aria-label={
                showConfirmPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={19} />
              ) : (
                <Eye size={19} />
              )}
            </button>
          </div>

          <div className="registration-divider" />

          <h3 className="registration-section-title">
            Personal Details
          </h3>

          <label htmlFor="register-name">
            Full Name *
          </label>

          <input
            id="register-name"
            type="text"
            name="name"
            placeholder="Enter your full name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <label htmlFor="register-phone">
            Mobile Number *
          </label>

          <input
            id="register-phone"
            type="tel"
            name="phone"
            placeholder="Enter your mobile number"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <label htmlFor="register-age">
            Age *
          </label>

          <input
            id="register-age"
            type="number"
            name="age"
            placeholder="Enter your age"
            value={formData.age}
            onChange={handleChange}
            min="1"
            max="120"
            required
          />

          <label htmlFor="register-gender">
            Gender *
          </label>

          <select
            id="register-gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Prefer not to say">
              Prefer not to say
            </option>
          </select>

          <label htmlFor="register-address">
            Address *
          </label>

          <textarea
            id="register-address"
            name="address"
            placeholder="Enter your residential address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            required
          />

          <label htmlFor="register-photo">
            Profile Photo (Optional)
          </label>

          <div className="registration-photo-section">
            {photo ? (
              <img
                src={photo}
                alt="Profile preview"
                className="registration-photo-preview"
              />
            ) : (
              <div className="registration-photo-placeholder">
                👤
              </div>
            )}

            <input
              id="register-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handlePhotoChange}
            />
          </div>

          {photoError && (
            <p className="registration-error" role="alert">
              {photoError}
            </p>
          )}

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
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

        <Link to="/" className="back-home">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Register;
