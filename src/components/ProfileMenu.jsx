
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ProfileMenu.css";

const ADMIN_SESSION_KEY = "carequeue-current-admin";
const PATIENT_SESSION_KEY = "carequeue-current-patient";
const AUTH_TOKEN_KEY = "carequeue-auth-token";

function readProfile(role) {
  const isAdmin = role.toLowerCase() === "admin";

  const email = sessionStorage.getItem(
    isAdmin ? ADMIN_SESSION_KEY : PATIENT_SESSION_KEY
  );

  if (!email) {
    return {
      name: isAdmin ? "Administrator" : "Patient",
      email: "",
      photo: "",
    };
  }

  const storageKey = isAdmin
    ? `carequeue-admin-profile-${email.toLowerCase()}`
    : `carequeue-profile-${email}`;

  try {
    const profile = JSON.parse(
      localStorage.getItem(storageKey) || "{}"
    );

    return {
      ...profile,
      name:
        profile.name ||
        profile.fullName ||
        (isAdmin ? "Administrator" : "Patient"),
      email: profile.email || email,
      photo: profile.photo || profile.profilePhoto || "",
    };
  } catch {
    return {
      name: isAdmin ? "Administrator" : "Patient",
      email,
      photo: "",
    };
  }
}

function ProfileMenu({ role = "Patient", name }) {
  const navigate = useNavigate();

  const isAdmin = role.toLowerCase() === "admin";

  const [profile, setProfile] = useState(() =>
    readProfile(role)
  );

  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refreshProfile = () => {
      setProfile(readProfile(role));
    };

    window.addEventListener("storage", refreshProfile);
    window.addEventListener("focus", refreshProfile);

    return () => {
      window.removeEventListener("storage", refreshProfile);
      window.removeEventListener("focus", refreshProfile);
    };
  }, [role]);

  const displayName =
    profile.name || name || (isAdmin ? "Administrator" : "Patient");

  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  const handleLogout = async () => {
    setOpen(false);

    try {
      // Revoke the refresh token on the backend
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Backend logout request failed:", error);
    } finally {
      // Clear local authentication data even if the backend is unavailable
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      sessionStorage.removeItem(PATIENT_SESSION_KEY);

      // Navigate according to the current account role
      navigate(
        isAdmin ? "/admin-login" : "/login",
        { replace: true }
      );
    }
  };

  return (
    <div className="profile-menu-container">
      <button
        type="button"
        className="profile-menu-trigger"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        {profile.photo ? (
          <img
            src={profile.photo}
            alt="Profile"
            className="profile-menu-photo"
          />
        ) : (
          <span className="profile-menu-avatar">
            {initial}
          </span>
        )}

        <span className="profile-menu-name">
          {displayName}
        </span>

        <span className="profile-menu-chevron">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="profile-menu-dismiss"
            aria-label="Close profile menu"
            onClick={() => setOpen(false)}
          />

          <div className="profile-menu-dropdown">
            <div className="profile-menu-user">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Profile"
                  className="profile-menu-dropdown-photo"
                />
              ) : (
                <span className="profile-menu-dropdown-avatar">
                  {initial}
                </span>
              )}

              <div>
                <strong>{displayName}</strong>
                <span>{profile.email || role}</span>
                <small>{role} Account</small>
              </div>
            </div>

            <div className="profile-menu-divider" />

            <button
              type="button"
              className="profile-menu-logout"
              onClick={handleLogout}
            >
              <span>↪</span>
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfileMenu;
