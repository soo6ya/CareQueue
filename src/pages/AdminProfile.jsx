
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardSidebar from "../components/DashboardSidebar";
import ProfileMenu from "../components/ProfileMenu";
import ThemeToggle from "../components/ThemeToggle";

import "./AdminProfile.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

function createDefaultProfile(email = "") {
  return {
    name: "",
    email,
    phone: "",
    profilePhotoData: "",
    qualification: "",
    specialization: "",
    experienceYears: "",
    aboutMe: "",
    consultationTimings: "",
  };
}

function AdminProfile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(createDefaultProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const authToken = sessionStorage.getItem("carequeue-auth-token");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!authToken) {
        navigate("/admin-login", { replace: true });
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/admin/doctor-profile`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
              Accept: "application/json",
            },
          }
        );

        const data = await response.json().catch(() => null);

        if (response.status === 401 || response.status === 403) {
          navigate("/admin-login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(
            data?.message || "Unable to load doctor profile."
          );
        }

        if (isMounted) {
          setProfile({
            ...createDefaultProfile(data.email || ""),
            ...data,
            experienceYears: data.experienceYears ?? "",
            profilePhotoData: data.profilePhotoData || "",
          });

          if (data.email) {
            sessionStorage.setItem(
              "carequeue-current-admin",
              data.email
            );
          }
        }
      } catch (err) {
        console.error("Doctor profile loading error:", err);

        if (isMounted) {
          setError(err.message || "Unable to load doctor profile.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [authToken, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSaved(false);
    setError("");
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPEG, PNG, WEBP or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setProfile((previous) => ({
        ...previous,
        profilePhotoData: reader.result,
      }));

      setSaved(false);
    };

    reader.onerror = () => {
      alert("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemovePhoto = () => {
    setProfile((previous) => ({
      ...previous,
      profilePhotoData: "",
    }));

    setSaved(false);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!profile.name.trim()) {
      alert("Please enter the doctor's name.");
      return;
    }

    const experience =
      profile.experienceYears === ""
        ? null
        : Number(profile.experienceYears);

    if (
      experience !== null &&
      (!Number.isInteger(experience) ||
        experience < 0 ||
        experience > 80)
    ) {
      alert("Experience must be a whole number between 0 and 80.");
      return;
    }

    const requestData = {
      name: profile.name.trim(),
      phone: profile.phone.trim(),
      profilePhotoData: profile.profilePhotoData || "",
      qualification: profile.qualification.trim(),
      specialization: profile.specialization.trim(),
      experienceYears: experience,
      aboutMe: profile.aboutMe.trim(),
      consultationTimings: profile.consultationTimings.trim(),
    };

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/doctor-profile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestData),
        }
      );

      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        navigate("/admin-login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to save doctor profile."
        );
      }

      setProfile({
        ...createDefaultProfile(data.email || profile.email),
        ...data,
        experienceYears: data.experienceYears ?? "",
        profilePhotoData: data.profilePhotoData || "",
      });

      setSaved(true);
      alert("Doctor profile updated successfully!");
    } catch (err) {
      console.error("Doctor profile saving error:", err);
      setError(err.message || "Unable to save doctor profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-profile-loading">
        Loading doctor profile...
      </div>
    );
  }

  const initial =
    profile.name.trim().charAt(0).toUpperCase() || "D";

  return (
    <div className="admin-profile-page">
      <header className="admin-profile-header">
        <div className="admin-profile-header-left">
          <DashboardSidebar role="Admin" />

          <div className="admin-profile-brand">
            <div className="admin-profile-logo">CQ</div>

            <div>
              <h2>CareQueue</h2>
              <p>Admin Control Panel</p>
            </div>
          </div>
        </div>

        <div className="admin-profile-header-right">
          <ThemeToggle />

          <ProfileMenu
            role="Admin"
            name={profile.name || "Doctor"}
          />
        </div>
      </header>

      <main className="admin-profile-container">
        <section className="admin-profile-heading">
          <span>DOCTOR PROFILE</span>

          <h1>About Me</h1>

          <p>
            Manage your professional information displayed to patients.
          </p>
        </section>

        <section className="admin-profile-card">
          <div className="admin-profile-card-heading">
            <div>
              <h2>Profile Information</h2>

              <p>
                Your public doctor profile will be displayed on the
                Patient Dashboard.
              </p>
            </div>

            <span className="admin-profile-role-badge">
              Admin / Doctor
            </span>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="admin-profile-photo-section">
              <div className="admin-profile-photo">
                {profile.profilePhotoData ? (
                  <img
                    src={profile.profilePhotoData}
                    alt="Doctor profile"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              <div className="admin-profile-photo-actions">
                <strong>Doctor Profile Photo</strong>

                <p>
                  Choose a professional photo.
                  Maximum size: 2 MB.
                </p>

                <div className="admin-profile-photo-buttons">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </button>

                  {profile.profilePhotoData && (
                    <button
                      type="button"
                      className="admin-remove-photo-btn"
                      onClick={handleRemovePhoto}
                    >
                      Remove Photo
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  hidden
                />
              </div>
            </div>

            <div className="admin-profile-divider" />

            <div className="admin-profile-form-grid">
              <div className="admin-profile-field">
                <label htmlFor="doctor-name">Doctor Name</label>

                <input
                  id="doctor-name"
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  placeholder="Enter doctor's name"
                  maxLength="120"
                  required
                />
              </div>

              <div className="admin-profile-field">
                <label htmlFor="doctor-email">Login Email</label>

                <input
                  id="doctor-email"
                  type="email"
                  value={profile.email}
                  disabled
                />

                <small>
                  Your login email is private and cannot be changed here.
                </small>
              </div>

              <div className="admin-profile-field">
                <label htmlFor="doctor-phone">Mobile Number</label>

                <input
                  id="doctor-phone"
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  maxLength="30"
                />

                <small>
                  Only you can view this number. It will not be shown
                  to patients.
                </small>
              </div>

              <div className="admin-profile-field">
                <label htmlFor="doctor-qualification">
                  Qualification
                </label>

                <input
                  id="doctor-qualification"
                  type="text"
                  name="qualification"
                  value={profile.qualification}
                  onChange={handleChange}
                  placeholder="Example: MBBS, MD"
                  maxLength="150"
                />
              </div>

              <div className="admin-profile-field">
                <label htmlFor="doctor-specialization">
                  Specialization
                </label>

                <input
                  id="doctor-specialization"
                  type="text"
                  name="specialization"
                  value={profile.specialization}
                  onChange={handleChange}
                  placeholder="Example: General Medicine"
                  maxLength="150"
                />
              </div>

              <div className="admin-profile-field">
                <label htmlFor="doctor-experience">
                  Years of Experience
                </label>

                <input
                  id="doctor-experience"
                  type="number"
                  name="experienceYears"
                  value={profile.experienceYears}
                  onChange={handleChange}
                  placeholder="Enter years of experience"
                  min="0"
                  max="80"
                  step="1"
                />
              </div>

              <div className="admin-profile-field full-width">
                <label htmlFor="doctor-about">
                  About the Doctor
                </label>

                <textarea
                  id="doctor-about"
                  name="aboutMe"
                  value={profile.aboutMe}
                  onChange={handleChange}
                  placeholder="Introduce yourself, your professional background and approach to patient care..."
                  rows="5"
                  maxLength="10000"
                />
              </div>

              <div className="admin-profile-field full-width">
                <label htmlFor="doctor-timings">
                  Consultation Timings
                </label>

                <textarea
                  id="doctor-timings"
                  name="consultationTimings"
                  value={profile.consultationTimings}
                  onChange={handleChange}
                  placeholder="Example: Monday to Saturday, 9:00 AM to 1:00 PM"
                  rows="3"
                  maxLength="500"
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                style={{ color: "#dc2626", marginTop: "16px" }}
              >
                {error}
              </p>
            )}

            <div className="admin-profile-form-footer">
              {saved && (
                <span className="admin-profile-saved">
                  ✓ Changes saved
                </span>
              )}

              <button
                type="submit"
                className="admin-profile-save-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}

export default AdminProfile;
