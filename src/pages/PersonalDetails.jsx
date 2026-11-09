import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  MapPin,
  Camera,
  ShieldCheck,
  LockKeyhole,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { apiFetch } from "../utils/api";
import "./PersonalDetails.css";

function PersonalDetails() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    address: "",
    photo: "",
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const readResponse = async (response) => {
    const text = await response.text();

    if (!text.trim()) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  };

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const response = await apiFetch("/api/auth/me");
        const data = await readResponse(response);

        if (!response.ok) {
          if (response.status === 401) {
            navigate("/login", { replace: true });
            return;
          }

          throw new Error(
            data.message || "Unable to load your profile."
          );
        }

        if (!active) return;

        setProfile({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          age: data.age ?? "",
          gender: data.gender || "",
          address: data.address || "",
          photo: data.profilePhotoData || "",
        });

        if (data.email) {
          sessionStorage.setItem(
            "carequeue-current-patient",
            data.email
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load your profile."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      setError("Photo must be smaller than 1.5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previous) => ({
        ...previous,
        photo: reader.result,
      }));

      setMessage("");
      setError("");
    };

    reader.onerror = () => {
      setError("Unable to read the selected photo.");
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !profile.name.trim() ||
      !profile.phone.trim() ||
      !profile.address.trim() ||
      !profile.age ||
      !profile.gender
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^\+?[0-9\s-]{7,15}$/.test(profile.phone.trim())) {
      setError("Please enter a valid phone number.");
      return;
    }

    const age = Number(profile.age);

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      setError("Please enter a valid age.");
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          age,
          gender: profile.gender,
          address: profile.address.trim(),
          profilePhotoData: profile.photo || null,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save your details."
        );
      }

      setProfile((previous) => ({
        ...previous,
        name: data.name || "",
        email: data.email || previous.email,
        phone: data.phone || "",
        age: data.age ?? "",
        gender: data.gender || "",
        address: data.address || "",
        photo: data.profilePhotoData || "",
      }));

      setMessage("Personal details updated successfully!");
    } catch (err) {
      setError(err.message || "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordInput = (event) => {
    const { name, value } = event.target;

    setPassword((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordMessage("");
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (
      !password.currentPassword ||
      !password.newPassword ||
      !password.confirmPassword
    ) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (
      password.newPassword.length < 8 ||
      password.newPassword.length > 72
    ) {
      setPasswordError(
        "New password must contain between 8 and 72 characters."
      );
      return;
    }

    if (password.newPassword !== password.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      const response = await apiFetch(
        "/api/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(password),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to change password."
        );
      }

      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPassword({
        current: false,
        new: false,
        confirm: false,
      });

      setPasswordMessage(
        data.message || "Password changed successfully!"
      );
    } catch (err) {
      setPasswordError(
        err.message || "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const passwordField = (
    label,
    name,
    visibilityKey,
    placeholder,
    autoComplete
  ) => (
    <div className="personal-form-group">
      <label htmlFor={name}>{label} *</label>

      <div className="password-input-wrapper">
        <input
          id={name}
          type={showPassword[visibilityKey] ? "text" : "password"}
          name={name}
          value={password[name]}
          onChange={handlePasswordInput}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={name === "currentPassword" ? undefined : 8}
          maxLength={72}
          required
        />

        <button
          type="button"
          className="password-visibility-btn"
          onClick={() => togglePasswordVisibility(visibilityKey)}
          aria-label={
            showPassword[visibilityKey]
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
        >
          {showPassword[visibilityKey] ? (
            <EyeOff size={19} />
          ) : (
            <Eye size={19} />
          )}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="personal-details-page">
        <div className="personal-loading">
          <UserRound size={30} />
          <p>Loading your personal details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="personal-details-page">
      <header className="personal-header">
        <button
          type="button"
          className="personal-back-btn"
          onClick={() => navigate("/patient-dashboard")}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <div className="personal-brand">
          <div className="personal-brand-logo">CQ</div>
          <span>CareQueue</span>
        </div>

        <div className="personal-header-spacer" />
      </header>

      <main className="personal-details-container">
        <section className="personal-details-heading">
          <span className="personal-eyebrow">
            <UserRound size={15} />
            MY ACCOUNT
          </span>

          <h1>Personal Details</h1>

          <p>
            Manage your personal information and account security.
          </p>
        </section>

        {/* PROFILE DETAILS */}

        <form
          className="personal-details-card"
          onSubmit={handleSave}
        >
          <div className="personal-card-heading">
            <div className="personal-card-heading-icon">
              <UserRound size={20} />
            </div>

            <div>
              <h2>Profile Information</h2>
              <p>Update your personal information below.</p>
            </div>
          </div>

          <div className="personal-photo-area">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt="Patient profile"
                className="personal-profile-photo"
              />
            ) : (
              <div className="personal-profile-placeholder">
                {profile.name?.charAt(0)?.toUpperCase() || (
                  <UserRound size={35} />
                )}
              </div>
            )}

            <div className="personal-photo-info">
              <strong>Profile Photo</strong>
              <p>Choose a clear photo for your account.</p>

              <label className="personal-photo-upload">
                <Camera size={15} />
                Change Photo

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                />
              </label>

              <small>Image files · Maximum 1.5 MB</small>
            </div>
          </div>

          <div className="personal-form-grid">
            <div className="personal-form-group">
              <label htmlFor="name">Full Name *</label>
              <div className="personal-input-wrapper">
                <UserRound size={17} />
                <input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div className="personal-form-group">
              <label htmlFor="email">Email Address</label>
              <div className="personal-input-wrapper readonly">
                <Mail size={17} />
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                />
                <ShieldCheck size={16} />
              </div>
              <small>Email address cannot be changed.</small>
            </div>

            <div className="personal-form-group">
              <label htmlFor="age">Age *</label>
              <div className="personal-input-wrapper">
                <CalendarDays size={17} />
                <input
                  id="age"
                  name="age"
                  type="number"
                  min="1"
                  max="120"
                  value={profile.age}
                  onChange={handleChange}
                  placeholder="Your age"
                  required
                />
              </div>
            </div>

            <div className="personal-form-group">
              <label htmlFor="phone">Phone Number *</label>
              <div className="personal-input-wrapper">
                <Phone size={17} />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="Your phone number"
                  required
                />
              </div>
            </div>

            <div className="personal-form-group">
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                name="gender"
                value={profile.gender}
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

            <div className="personal-form-group full-width">
              <label htmlFor="address">Residential Address *</label>
              <div className="personal-input-wrapper personal-textarea-wrapper">
                <MapPin size={17} />
                <textarea
                  id="address"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  placeholder="Your residential address"
                  rows={4}
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="personal-feedback error">
              <AlertCircle size={17} />
              {error}
            </div>
          )}

          {message && (
            <div className="personal-feedback success">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          <div className="personal-form-actions">
            <button
              type="button"
              className="personal-cancel-btn"
              onClick={() => navigate("/patient-dashboard")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="personal-save-btn"
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {/* CHANGE PASSWORD */}

        <section className="personal-details-card password-card">
          <div className="personal-card-heading">
            <div className="personal-card-heading-icon security">
              <LockKeyhole size={20} />
            </div>

            <div>
              <h2>Change Password</h2>
              <p>
                Keep your account secure by updating your password.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div className="personal-form-grid">
              {passwordField(
                "Current Password",
                "currentPassword",
                "current",
                "Enter current password",
                "current-password"
              )}

              {passwordField(
                "New Password",
                "newPassword",
                "new",
                "Enter new password",
                "new-password"
              )}

              {passwordField(
                "Confirm New Password",
                "confirmPassword",
                "confirm",
                "Confirm new password",
                "new-password"
              )}
            </div>

            <p className="password-hint">
              Your new password must contain between 8 and 72 characters.
            </p>

            {passwordError && (
              <div className="personal-feedback error">
                <AlertCircle size={17} />
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div className="personal-feedback success">
                <CheckCircle2 size={17} />
                {passwordMessage}
              </div>
            )}

            <div className="personal-form-actions">
              <button
                type="submit"
                className="personal-save-btn"
                disabled={changingPassword}
              >
                <LockKeyhole size={16} />
                {changingPassword
                  ? "Changing..."
                  : "Change Password"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default PersonalDetails;