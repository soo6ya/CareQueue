
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, HeartPulse, UserRound, ShieldCheck } from "lucide-react";
import "./Register.css";

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
      setPhotoError("Photo must be smaller than 1.5 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhoto(reader.result);
    };

    reader.onerror = () => {
      setPhotoError("Unable to read the selected photo.");
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
      setError("Please complete all required personal details.");
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
      <div className="register-page">
        <div className="register-card otp-card">
          <div className="register-brand">
            <div className="register-logo">
              <HeartPulse size={27} />
            </div>
            <span>CareQueue</span>
          </div>

          <div className="otp-icon">
            <ShieldCheck size={34} />
          </div>

          <h1>Verify your email</h1>

          <p className="register-subtitle">
            We've sent a 6-digit verification code to
          </p>

          <p className="otp-email">
            {formData.email.trim().toLowerCase()}
          </p>

          <form onSubmit={handleVerifyOtp}>
            <label htmlFor="verification-otp">
              Verification code
            </label>

            <input
              className="otp-input"
              id="verification-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
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
            />

            {error && (
              <p className="register-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="register-submit"
              disabled={loading || otp.length !== 6}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </form>

          <p className="register-footer">
            Already verified? <Link to="/login">Login</Link>
          </p>

          <button
            type="button"
            className="register-back"
            onClick={() => {
              setOtpStep(false);
              setOtp("");
              setError("");
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
    <div className="register-page">
      <div className="register-card">
        <div className="register-brand">
          <div className="register-logo">
            <HeartPulse size={27} />
          </div>
          <span>CareQueue</span>
        </div>

        <div className="register-heading">
          <span className="register-eyebrow">
            PATIENT REGISTRATION
          </span>

          <h1>Create your account</h1>

          <p className="register-subtitle">
            Join CareQueue and manage your hospital visits with ease.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="register-section-heading">
            <span className="section-icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <h3>Account Information</h3>
              <p>Your login credentials</p>
            </div>
          </div>

          <div className="register-form-grid">
            <div className="register-field full-width">
              <label htmlFor="register-email">
                Email Address <span>*</span>
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-password">
                Password <span>*</span>
              </label>

              <div className="register-password-wrap">
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
                  className="register-password-toggle"
                  onClick={() =>
                    setShowPassword((value) => !value)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="register-confirm-password">
                Confirm Password <span>*</span>
              </label>

              <div className="register-password-wrap">
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                />

                <button
                  type="button"
                  className="register-password-toggle"
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
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="register-divider" />

          <div className="register-section-heading">
            <span className="section-icon">
              <UserRound size={18} />
            </span>
            <div>
              <h3>Personal Details</h3>
              <p>Tell us a little about yourself</p>
            </div>
          </div>

          <div className="register-form-grid">
            <div className="register-field">
              <label htmlFor="register-name">
                Full Name <span>*</span>
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
            </div>

            <div className="register-field">
              <label htmlFor="register-phone">
                Mobile Number <span>*</span>
              </label>
              <input
                id="register-phone"
                type="tel"
                name="phone"
                placeholder="Enter mobile number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="register-age">
                Age <span>*</span>
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
            </div>

            <div className="register-field">
              <label htmlFor="register-gender">
                Gender <span>*</span>
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
            </div>

            <div className="register-field full-width">
              <label htmlFor="register-address">
                Residential Address <span>*</span>
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
            </div>
          </div>

          <div className="register-photo-block">
            <label htmlFor="register-photo">
              Profile Photo <span className="optional-label">Optional</span>
            </label>

            <div className="register-photo-content">
              {photo ? (
                <img
                  src={photo}
                  alt="Profile preview"
                  className="register-photo-preview"
                />
              ) : (
                <div className="register-photo-placeholder">
                  <UserRound size={26} />
                </div>
              )}

              <div className="register-photo-input">
                <input
                  id="register-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                />
                <p>JPG, PNG, WEBP or GIF · Maximum 1.5 MB</p>
              </div>
            </div>

            {photoError && (
              <p className="register-error" role="alert">
                {photoError}
              </p>
            )}
          </div>

          {error && (
            <p className="register-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="register-submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <p className="register-terms">
            By creating an account, you agree to provide accurate
            information for your CareQueue profile.
          </p>
        </form>

        <div className="register-bottom">
          <p className="register-footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>

          <Link to="/" className="register-back">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
