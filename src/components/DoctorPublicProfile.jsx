
import { useEffect, useState } from "react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

function DoctorPublicProfile() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDoctor() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/doctor-profile/public`,
          {
            headers: { Accept: "application/json" },
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message || "Unable to load doctor information."
          );
        }

        if (active) setDoctor(data);
      } catch (err) {
        console.error("Doctor profile error:", err);
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDoctor();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="doctor-public-profile-section"
      style={{ margin: "24px 0" }}
    >
      <h2>Meet Your Doctor</h2>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "20px",
          flexWrap: "wrap",
          padding: "22px",
          borderRadius: "14px",
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e5e7eb)",
        }}
      >
        {loading ? (
          <p>Loading doctor information...</p>
        ) : error ? (
          <p role="status">{error}</p>
        ) : doctor ? (
          <>
            {doctor.profilePhotoData ? (
              <img
                src={doctor.profilePhotoData}
                alt={doctor.name || "Doctor"}
                style={{
                  width: "112px",
                  height: "112px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "112px",
                  height: "112px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#e5e7eb",
                  fontSize: "42px",
                  flexShrink: 0,
                }}
              >
                👨‍⚕️
              </div>
            )}

            <div style={{ flex: 1, minWidth: "220px" }}>
              <h3 style={{ margin: "0 0 8px" }}>
                {doctor.name || "Doctor"}
              </h3>

              {doctor.qualification && (
                <p>
                  <strong>Qualification:</strong>{" "}
                  {doctor.qualification}
                </p>
              )}

              {doctor.specialization && (
                <p>
                  <strong>Specialization:</strong>{" "}
                  {doctor.specialization}
                </p>
              )}

              {doctor.experienceYears != null && (
                <p>
                  <strong>Experience:</strong>{" "}
                  {doctor.experienceYears} years
                </p>
              )}

              {doctor.aboutMe && (
                <p style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {doctor.aboutMe}
                </p>
              )}

              {doctor.consultationTimings && (
                <p>
                  <strong>Consultation Timings:</strong>{" "}
                  {doctor.consultationTimings}
                </p>
              )}
            </div>
          </>
        ) : (
          <p>Doctor information is currently unavailable.</p>
        )}
      </div>
    </section>
  );
}

export default DoctorPublicProfile;
