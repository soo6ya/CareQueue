
import { useNavigate } from "react-router-dom";
import { useQueue } from "../context/QueueContext";
import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  UserRound,
  Stethoscope,
  Ticket,
  CalendarDays,
  Timer,
  PhoneCall,
  ClipboardList,
  Pill,
  RefreshCw,
  HeartPulse,
  Clock3,
  Users,
} from "lucide-react";

import "./PatientDashboard.css";

import ProfileMenu from "../components/ProfileMenu";
import ThemeToggle from "../components/ThemeToggle";
import DashboardSidebar from "../components/DashboardSidebar";
import NotificationCenter from "../components/NotificationCenter";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");

const HOSPITAL_EMERGENCY_NUMBER =
  import.meta.env.VITE_HOSPITAL_EMERGENCY_NUMBER || "9496673835";

function formatConsultationTime(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleString();
}

function PatientDashboard() {
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [consultationsError, setConsultationsError] = useState("");

  const [doctorProfile, setDoctorProfile] = useState(null);
  const [doctorProfileLoading, setDoctorProfileLoading] = useState(true);
  const [doctorProfileError, setDoctorProfileError] = useState("");

  const [appointmentEmail, setAppointmentEmail] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const { queueData, patientToken } = useQueue();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const currentHour = currentTime.getHours();

  const greeting =
    currentHour >= 5 && currentHour < 12
      ? "Good morning"
      : currentHour >= 12 && currentHour < 17
        ? "Good afternoon"
        : "Good evening";

  const patientEmail = sessionStorage.getItem(
    "carequeue-current-patient"
  );

  const authToken = sessionStorage.getItem("carequeue-auth-token");

  // Load public doctor profile.
  useEffect(() => {
    let isMounted = true;

    const loadDoctorProfile = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/doctor-profile/public`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          }
        );

        const responseData = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            responseData?.message ||
              `Unable to load doctor profile (${response.status}).`
          );
        }

        if (isMounted) {
          setDoctorProfile(responseData);
          setDoctorProfileError("");
        }
      } catch (error) {
        console.error("Doctor profile loading error:", error);

        if (isMounted) {
          setDoctorProfileError(
            error.message || "Unable to load doctor profile."
          );
        }
      } finally {
        if (isMounted) setDoctorProfileLoading(false);
      }
    };

    loadDoctorProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load authenticated patient profile.
  useEffect(() => {
    let isMounted = true;

    const loadPatientProfile = async () => {
      if (!authToken) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: "application/json",
          },
        });

        const responseData = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            responseData?.message || "Your login session has expired."
          );
        }

        if (responseData?.role !== "PATIENT") {
          sessionStorage.removeItem("carequeue-auth-token");
          sessionStorage.removeItem("carequeue-current-patient");

          navigate("/login", { replace: true });
          return;
        }

        if (isMounted) {
          setPatient(responseData);

          sessionStorage.setItem(
            "carequeue-current-patient",
            responseData.email
          );
        }
      } catch (error) {
        console.error("Patient profile loading error:", error);

        sessionStorage.removeItem("carequeue-auth-token");
        sessionStorage.removeItem("carequeue-current-patient");

        if (isMounted) {
          navigate("/login", { replace: true });
        }
      }
    };

    loadPatientProfile();

    return () => {
      isMounted = false;
    };
  }, [authToken, navigate]);

  // Load appointment email.
  useEffect(() => {
    let isMounted = true;

    const loadAppointmentEmail = async () => {
      if (!authToken) return;

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/doctor-profile/appointment-email`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
              Accept: "application/json",
            },
          }
        );

        const responseData = await response.json().catch(() => null);

        if (!response.ok || !responseData?.email) {
          throw new Error(
            responseData?.message || "Appointment email is unavailable."
          );
        }

        if (isMounted) {
          setAppointmentEmail(responseData.email);
        }
      } catch (error) {
        console.error("Appointment email loading error:", error);

        if (isMounted) setAppointmentEmail("");
      }
    };

    loadAppointmentEmail();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  // Fetch consultation and prescription history.
  const fetchConsultations = useCallback(async () => {
    if (!authToken || !patientEmail) {
      setConsultations([]);
      setConsultationsLoading(false);
      return;
    }

    setConsultationsLoading(true);
    setConsultationsError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/consultations?patientEmail=${encodeURIComponent(
          patientEmail
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            Accept: "application/json",
          },
        }
      );

      const responseData = await response.json().catch(() => null);

      if (response.status === 401) {
        sessionStorage.removeItem("carequeue-auth-token");
        sessionStorage.removeItem("carequeue-current-patient");

        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            `Unable to load consultation history (${response.status}).`
        );
      }

      if (!Array.isArray(responseData)) {
        throw new Error(
          "The server returned an invalid consultation history."
        );
      }

      setConsultations(responseData);
    } catch (error) {
      console.error("Prescription history loading error:", error);

      setConsultationsError(
        error.message || "Unable to connect to the consultation server."
      );
    } finally {
      setConsultationsLoading(false);
    }
  }, [authToken, patientEmail, navigate]);

  useEffect(() => {
    fetchConsultations();

    const handleFocus = () => fetchConsultations();

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchConsultations]);

  const {
    department,
    doctor,
    estimatedTime,
    nowServing,
    waitingPatients,
    waitingTokens,
    queuePaused,
    queueSessionId,
  } = queueData;

  // Appointment request through Gmail.
  const handleAppointmentClick = () => {
    if (!appointmentEmail) {
      alert(
        "Appointment email is not available. Please refresh the page and try again."
      );
      return;
    }

    const subject = "Appointment Request - CareQueue";

    const body = [
      "Dear Doctor,",
      "",
      "I would like to request an appointment through CareQueue.",
      "",
      `Patient Name: ${patient?.name || ""}`,
      `Patient Email: ${patient?.email || ""}`,
      `Department: ${department || "Not specified"}`,
      `Doctor: ${doctorProfile?.name || doctor || "Not specified"}`,
      "",
      "Preferred Date: [ENTER DATE]",
      "Preferred Time: [ENTER TIME]",
      "",
      "Reason for Appointment: [ENTER REASON]",
      "",
      "Please let me know your availability.",
      "",
      "Thank you,",
      patient?.name || "",
    ].join("\n");

    const gmailUrl =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(appointmentEmail)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    window.open(gmailUrl, "_blank", "noopener,noreferrer");
  };

  // Emergency call.
  const handleEmergencyCall = () => {
    const dialNumber = HOSPITAL_EMERGENCY_NUMBER.replace(/[^\d+]/g, "");

    if (!dialNumber) {
      alert("Hospital contact number is unavailable.");
      return;
    }

    window.location.href = `tel:${dialNumber}`;
  };

  const hasActiveToken =
    patientToken !== null && patientToken !== undefined;

  const completedConsultation = hasActiveToken
    ? consultations.find(
        (record) =>
          Number(record.token) === Number(patientToken) &&
          record.queueSessionId === queueSessionId &&
          String(record.patientEmail || "").toLowerCase() ===
            String(patient?.email || patientEmail || "").toLowerCase()
      )
    : null;

  const isConsulted = Boolean(completedConsultation);

  // Keep the full consultation list for queue logic and select only the
  // newest consultation for the dashboard preview.
  const latestConsultation = [...consultations].sort((a, b) => {
    const dateA = new Date(a.completedAt || 0).getTime();
    const dateB = new Date(b.completedAt || 0).getTime();
    return (Number.isNaN(dateB) ? 0 : dateB) -
      (Number.isNaN(dateA) ? 0 : dateA);
  })[0] || null;

  const isCurrentlyServing =
    hasActiveToken &&
    !isConsulted &&
    Number(patientToken) === Number(nowServing);

  const peopleAhead =
    hasActiveToken && !isConsulted && !isCurrentlyServing
      ? waitingTokens.filter(
          (token) => Number(token) < Number(patientToken)
        ).length + 1
      : 0;

  const calculatedWait =
    isCurrentlyServing || isConsulted
      ? 0
      : peopleAhead * estimatedTime;

  if (!patient) {
    return (
      <div className="patient-dashboard-page patient-loading-page">
        <div className="patient-loading-card">
          <Activity size={28} className="loading-icon" />
          <p>Loading your patient profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard-page">
      <NotificationCenter
        queueData={queueData}
        patientToken={patientToken}
      />

      {/* HEADER */}
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <DashboardSidebar role="Patient" />

          <div className="dashboard-brand">
            <div className="dashboard-logo">
              <Activity size={24} strokeWidth={2.5} />
            </div>

            <div>
              <h2>CareQueue</h2>
              <p>Digital Queue System</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <ThemeToggle />

          <ProfileMenu
            role="Patient"
            name={patient.name}
          />
        </div>
      </header>

      <main className="patient-dashboard-container">

        {/* WELCOME */}
        <section className="dashboard-welcome">
          <span className="dashboard-label">
            PATIENT DASHBOARD
          </span>

          <h1>
            {greeting}, {patient.name}
            <HeartPulse
              className="welcome-icon"
              size={25}
              aria-hidden="true"
            />
          </h1>

          <p>
            Manage your appointment and track your hospital queue.
          </p>
        </section>

        {/* PATIENT INFORMATION */}
        <section className="patient-profile-card">
          {patient.profilePhotoData ? (
            <img
              className="patient-profile-image"
              src={patient.profilePhotoData}
              alt="Patient profile"
            />
          ) : (
            <div className="patient-profile-avatar">
              <UserRound size={35} strokeWidth={1.8} />
            </div>
          )}

          <div className="patient-profile-content">
            <h2>Patient Information</h2>

            <div className="patient-information-grid">
              <p><strong>Name:</strong> {patient.name || "Not available"}</p>
              <p><strong>Email:</strong> {patient.email || "Not available"}</p>
              <p><strong>Mobile:</strong> {patient.phone || "Not available"}</p>
              <p><strong>Age:</strong> {patient.age ?? "Not available"}</p>
              <p><strong>Gender:</strong> {patient.gender || "Not available"}</p>
              <p><strong>Address:</strong> {patient.address || "Not available"}</p>
            </div>
          </div>
        </section>

        {/* ACTIVE QUEUE */}
        <section className="active-queue-card">
          <div className="active-queue-content">
            <span className="dashboard-label">YOUR QUEUE</span>

            {hasActiveToken ? (
              <>
                <div className="active-token-row">
                  <div>
                    <h2>
                      A-{String(patientToken).padStart(3, "0")}
                    </h2>

                    <p>
                      {isConsulted
                        ? "Your consultation is completed."
                        : isCurrentlyServing
                          ? "You are currently being served."
                          : "You are currently in the queue."}
                    </p>
                  </div>

                  <div className={queuePaused ? "queue-badge paused" : "queue-badge"}>
                    <span></span>
                    {queuePaused ? "PAUSED" : "LIVE"}
                  </div>
                </div>

                <div className="active-queue-info">
                  <div>
                    <span>NOW SERVING</span>
                    <strong>
                      A-{String(nowServing).padStart(3, "0")}
                    </strong>
                  </div>

                  <div>
                    <span>PEOPLE AHEAD</span>
                    <strong>{peopleAhead}</strong>
                  </div>

                  <div>
                    <span>EST. WAIT</span>
                    <strong>{calculatedWait} min</strong>
                  </div>
                </div>

                {isConsulted ? (
                  <button
                    type="button"
                    className="view-queue-btn"
                    onClick={() => navigate("/get-token")}
                  >
                    <Ticket size={17} />
                    Book New Token
                  </button>
                ) : (
                  <button
                    type="button"
                    className="view-queue-btn"
                    onClick={() => navigate("/queue-status")}
                  >
                    <Activity size={17} />
                    View Queue Status
                  </button>
                )}
              </>
            ) : (
              <>
                <h2>No Active Token</h2>

                <p>
                  You are not currently waiting in a queue. Get a token
                  to join the hospital queue.
                </p>

                <button
                  type="button"
                  className="get-token-dashboard-btn"
                  onClick={() => navigate("/get-token")}
                >
                  <Ticket size={17} />
                  Get New Token
                </button>
              </>
            )}
          </div>
        </section>

        {/* CURRENT SERVICE */}
        <section className="current-service-section">
          <h2>Current Service</h2>

          <div className="current-service-card">
            <div className="service-icon">
              <Stethoscope size={25} />
            </div>

            <div className="service-details">
              <span>DEPARTMENT</span>
              <strong>{department}</strong>

              <span>DOCTOR</span>
              <p>{doctor}</p>
            </div>

            <div className={queuePaused ? "service-status paused" : "service-status"}>
              {queuePaused ? "Queue Paused" : "Queue Open"}
            </div>
          </div>
        </section>

        {/* PUBLIC DOCTOR PROFILE */}
        <section className="doctor-public-profile-section">
          <h2>Meet Your Doctor</h2>

          <div className="doctor-public-profile-card">
            {doctorProfileLoading ? (
              <div className="profile-loading">
                <Activity size={22} />
                <p>Loading doctor information...</p>
              </div>
            ) : doctorProfileError ? (
              <p role="status">{doctorProfileError}</p>
            ) : doctorProfile ? (
              <>
                {doctorProfile.profilePhotoData ? (
                  <img
                    className="doctor-profile-image"
                    src={doctorProfile.profilePhotoData}
                    alt={doctorProfile.name || "Doctor"}
                  />
                ) : (
                  <div className="doctor-profile-avatar" aria-hidden="true">
                    <Stethoscope size={43} strokeWidth={1.6} />
                  </div>
                )}

                <div className="doctor-profile-content">
                  <h3>{doctorProfile.name || "Doctor"}</h3>

                  {doctorProfile.qualification && (
                    <p>
                      <strong>Qualification:</strong>{" "}
                      {doctorProfile.qualification}
                    </p>
                  )}

                  {doctorProfile.specialization && (
                    <p>
                      <strong>Specialization:</strong>{" "}
                      {doctorProfile.specialization}
                    </p>
                  )}

                  {doctorProfile.experienceYears != null && (
                    <p>
                      <strong>Experience:</strong>{" "}
                      {doctorProfile.experienceYears} years
                    </p>
                  )}

                  {doctorProfile.aboutMe && (
                    <p className="doctor-about">
                      {doctorProfile.aboutMe}
                    </p>
                  )}

                  {doctorProfile.consultationTimings && (
                    <p>
                      <strong>Consultation Timings:</strong>{" "}
                      {doctorProfile.consultationTimings}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p>Doctor information is currently unavailable.</p>
            )}
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="quick-actions-section">
          <h2>Quick Actions</h2>

          <div className="quick-actions-grid">
            <button
              type="button"
              className="quick-action-card"
              onClick={() => navigate("/get-token")}
            >
              <div className="quick-action-icon">
                <Ticket size={22} />
              </div>
              <div>
                <strong>Get Token</strong>
                <span>Join the queue</span>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-card"
              onClick={handleAppointmentClick}
            >
              <div className="quick-action-icon">
                <CalendarDays size={22} />
              </div>
              <div>
                <strong>Appointment</strong>
                <span>Request an appointment</span>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-card"
              onClick={() => navigate("/queue-status")}
            >
              <div className="quick-action-icon">
                <Timer size={22} />
              </div>
              <div>
                <strong>Queue Status</strong>
                <span>Track your token</span>
              </div>
            </button>

            <button
              type="button"
              className="quick-action-card emergency-call-card"
              onClick={handleEmergencyCall}
            >
              <div className="quick-action-icon">
                <PhoneCall size={22} />
              </div>
              <div>
                <strong>Emergency Call</strong>
                <span>Call hospital for assistance</span>
              </div>
            </button>
          </div>

          <p className="emergency-note">
            If you are in immediate danger, contact your local emergency services.
          </p>
        </section>

        {/* LATEST PRESCRIPTION */}
        <section className="patient-prescription-history">
          <div className="patient-history-heading">
            <div>
              <span className="dashboard-label">YOUR MEDICAL RECORDS</span>
              <h2>Latest Prescription</h2>
              <p>Your most recent consultation and prescribed medicines.</p>
            </div>

            <div className="patient-history-actions">
              <button
                type="button"
                onClick={fetchConsultations}
                disabled={consultationsLoading}
              >
                <RefreshCw
                  size={16}
                  className={consultationsLoading ? "refresh-spinning" : ""}
                />
                {consultationsLoading ? "Refreshing..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/prescriptions")}
              >
                <ClipboardList size={16} />
                View All Prescriptions
              </button>
            </div>
          </div>

          {consultationsLoading ? (
            <div className="patient-history-message">
              <Activity size={25} />
              <p>Loading your latest prescription...</p>
            </div>
          ) : consultationsError ? (
            <div className="patient-history-message error">
              <p>{consultationsError}</p>
              <button type="button" onClick={fetchConsultations}>
                Try Again
              </button>
            </div>
          ) : !latestConsultation ? (
            <div className="patient-history-message">
              <ClipboardList size={38} className="history-empty-icon" />
              <strong>No Prescription Yet</strong>
              <p>Your completed consultation will appear here.</p>
            </div>
          ) : (
            <div className="patient-history-list">
              <article
                className="patient-history-card"
                key={latestConsultation.id}
              >
                <div className="patient-history-card-heading">
                  <div>
                    <span>CONSULTATION TOKEN</span>
                    <h3>
                      A-{String(latestConsultation.token).padStart(3, "0")}
                    </h3>
                  </div>
                  <span className="patient-history-status">Completed</span>
                </div>

                <div className="patient-history-details">
                  <div>
                    <span><Clock3 size={13} /> DATE</span>
                    <strong>
                      {formatConsultationTime(latestConsultation.completedAt)}
                    </strong>
                  </div>
                  <div>
                    <span><Activity size={13} /> DEPARTMENT</span>
                    <strong>{latestConsultation.department || "Not specified"}</strong>
                  </div>
                  <div>
                    <span><Stethoscope size={13} /> DOCTOR</span>
                    <strong>{latestConsultation.doctor || "Not specified"}</strong>
                  </div>
                </div>

                <div className="patient-history-section">
                  <h4>Reason for Visit</h4>
                  <p>{latestConsultation.reason || "Not recorded"}</p>
                </div>

                <div className="patient-history-section">
                  <h4>Diagnosis</h4>
                  <p>{latestConsultation.diagnosis || "No diagnosis recorded"}</p>
                </div>

                <div className="patient-history-section">
                  <h4>Doctor's Notes</h4>
                  <p>{latestConsultation.notes || "No additional notes"}</p>
                </div>

                <div className="patient-history-prescription">
                  <h4><Pill size={18} /> Prescribed Medicines</h4>
                  {latestConsultation.medicines?.length > 0 ? (
                    <div className="patient-medicine-list">
                      {latestConsultation.medicines.map((medicine, index) => (
                        <div
                          className="patient-medicine-item"
                          key={`${latestConsultation.id}-${index}`}
                        >
                          <strong>{medicine.name}</strong>
                          <div className="patient-medicine-details">
                            {medicine.dosage && (
                              <span><b>Dosage:</b> {medicine.dosage}</span>
                            )}
                            {medicine.frequency && (
                              <span><b>Frequency:</b> {medicine.frequency}</span>
                            )}
                            {medicine.duration && (
                              <span><b>Duration:</b> {medicine.duration}</span>
                            )}
                            {medicine.instructions && (
                              <span><b>Instructions:</b> {medicine.instructions}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No medicines prescribed for this consultation.</p>
                  )}
                </div>
              </article>
            </div>
          )}
        </section>

        {/* LIVE QUEUE INFORMATION */}
        <section className="live-queue-section">
          <div className="live-section-heading">
            <div>
              <h2>Live Queue Information</h2>
              <p>Current information for {department}.</p>
            </div>

            <span className={queuePaused ? "live-status paused" : "live-status"}>
              <span></span>
              {queuePaused ? "Paused" : "Live"}
            </span>
          </div>

          <div className="live-queue-grid">
            <div className="live-queue-card">
              <span><Ticket size={14} /> NOW SERVING</span>
              <strong>A-{String(nowServing).padStart(3, "0")}</strong>
            </div>

            <div className="live-queue-card">
              <span><Users size={14} /> WAITING</span>
              <strong>{waitingPatients}</strong>
            </div>

            <div className="live-queue-card">
              <span><Clock3 size={14} /> TREATMENT TIME</span>
              <strong>{estimatedTime} min</strong>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default PatientDashboard;
