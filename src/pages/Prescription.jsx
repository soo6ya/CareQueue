import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileText,
  HeartPulse,
  Pill,
  RefreshCw,
  Stethoscope,
  UserRound,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";

import ProfileMenu from "../components/ProfileMenu";
import ThemeToggle from "../components/ThemeToggle";
import DashboardSidebar from "../components/DashboardSidebar";
import { apiFetch } from "../utils/api";

import "./Prescription.css";

export default function Prescription() {
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const email = sessionStorage.getItem(
      "carequeue-current-patient"
    );

    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    let isActive = true;
    const controller = new AbortController();

    const loadPrescriptions = async () => {
      setLoading(true);
      setError("");

      try {
        const savedProfile = localStorage.getItem(
          `carequeue-profile-${email}`
        );

        if (!savedProfile) {
          navigate("/register", { replace: true });
          return;
        }

        const parsedProfile = JSON.parse(savedProfile);

        if (isActive) {
          setPatient(parsedProfile);
        }

        const response = await apiFetch(
          `/api/consultations?patientEmail=${encodeURIComponent(email)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const responseData = await response
            .json()
            .catch(() => null);

          throw new Error(
            responseData?.message ||
              `Unable to load prescriptions. Server returned ${response.status}.`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "Unexpected response received from the server."
          );
        }

        if (isActive) {
          setPrescriptions(data);
        }
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("Error loading prescriptions:", err);

        if (isActive) {
          setError(
            err.message ||
              "Unable to connect to the prescription server."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadPrescriptions();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [navigate, refreshCount]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!patient) {
    return (
      <div className="prescription-page">
        <div className="prescription-loading-page">
          <ClipboardList size={30} />
          <p>Loading your prescriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prescription-page">

      {/* HEADER */}

      <header className="prescription-header">

        <div className="prescription-header-left">

          <DashboardSidebar role="Patient" />

          <div className="prescription-brand">

            <div className="prescription-logo">
              CQ
            </div>

            <div>
              <h2>CareQueue</h2>
              <p>Digital Queue System</p>
            </div>

          </div>

        </div>

        <div className="prescription-header-actions">

          <ThemeToggle />

          <ProfileMenu
            role="Patient"
            name={patient.name}
          />

        </div>

      </header>

      {/* MAIN CONTENT */}

      <main className="prescription-container">

        <section className="prescription-welcome">

          <div className="prescription-welcome-label">
            <HeartPulse size={17} />
            <span>PATIENT PORTAL</span>
          </div>

          <h1>My Prescriptions</h1>

          <p>
            View your prescriptions and medication
            instructions provided by your doctor.
          </p>

        </section>

        {/* PRESCRIPTION CONTENT */}

        <section className="prescription-content">

          <div className="prescription-section-heading">

            <div className="prescription-heading-title">

              <div className="prescription-heading-icon">
                <FileText size={21} />
              </div>

              <div>
                <h2>Prescription History</h2>

                <p>
                  Your available medical prescriptions.
                </p>
              </div>

            </div>

            <div className="prescription-heading-actions">

              <span className="prescription-count">
                <Pill size={15} />

                {prescriptions.length}{" "}
                {prescriptions.length === 1
                  ? "Prescription"
                  : "Prescriptions"}
              </span>

              {!loading && !error && prescriptions.length > 0 && (
                <button
                  type="button"
                  className="prescription-refresh-button"
                  onClick={() =>
                    setRefreshCount((count) => count + 1)
                  }
                  title="Refresh prescriptions"
                >
                  <RefreshCw size={15} />
                </button>
              )}

            </div>

          </div>

          {/* LOADING */}

          {loading ? (

            <div className="prescription-empty">

              <div className="prescription-empty-icon loading">
                <RefreshCw size={30} />
              </div>

              <h2>Loading Prescriptions</h2>

              <p>
                Please wait while we retrieve your
                prescription history.
              </p>

            </div>

          ) : error ? (

            /* ERROR */

            <div className="prescription-empty">

              <div className="prescription-empty-icon error">
                <AlertCircle size={30} />
              </div>

              <h2>Unable to Load Prescriptions</h2>

              <p>{error}</p>

              <button
                type="button"
                onClick={() =>
                  setRefreshCount((count) => count + 1)
                }
              >
                <RefreshCw size={16} />
                Try Again
              </button>

            </div>

          ) : prescriptions.length === 0 ? (

            /* EMPTY */

            <div className="prescription-empty">

              <div className="prescription-empty-icon">
                <Pill size={31} />
              </div>

              <h2>No Prescriptions Yet</h2>

              <p>
                You don't have any prescriptions available
                at the moment. Once your doctor completes
                a consultation and saves your prescription,
                it will appear here.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("/patient-dashboard")
                }
              >
                <LayoutDashboard size={16} />
                Back to Dashboard
              </button>

            </div>

          ) : (

            /* PRESCRIPTION LIST */

            <div className="prescription-list">

              {prescriptions.map((prescription, index) => (

                <article
                  className="prescription-card"
                  key={prescription.id || index}
                >

                  {/* CARD HEADER */}

                  <div className="prescription-card-header">

                    <div className="prescription-token-info">

                      <div className="prescription-card-icon">
                        <FileText size={20} />
                      </div>

                      <div>
                        <span className="prescription-label">
                          PRESCRIPTION
                        </span>

                        <h3>
                          {`Token A-${String(
                            prescription.token ?? ""
                          ).padStart(3, "0")}`}
                        </h3>
                      </div>

                    </div>

                    <span className="prescription-date">
                      <CalendarDays size={14} />
                      {formatDate(prescription.completedAt)}
                    </span>

                  </div>

                  {/* PATIENT / DOCTOR DETAILS */}

                  <div className="prescription-doctor-info">

                    <div className="prescription-info-item">
                      <UserRound size={16} />
                      <p>
                        <strong>Patient</strong>
                        <span>
                          {prescription.patientName || patient.name}
                        </span>
                      </p>
                    </div>

                    <div className="prescription-info-item">
                      <Stethoscope size={16} />
                      <p>
                        <strong>Doctor</strong>
                        <span>
                          {prescription.doctor || "Not specified"}
                        </span>
                      </p>
                    </div>

                    <div className="prescription-info-item">
                      <Activity size={16} />
                      <p>
                        <strong>Department</strong>
                        <span>
                          {prescription.department || "Not specified"}
                        </span>
                      </p>
                    </div>

                    <div className="prescription-info-item">
                      <ClipboardList size={16} />
                      <p>
                        <strong>Reason for Visit</strong>
                        <span>
                          {prescription.reason || "Not specified"}
                        </span>
                      </p>
                    </div>

                  </div>

                  {/* DIAGNOSIS */}

                  {prescription.diagnosis && (
                    <div className="prescription-detail">

                      <h4>
                        <Activity size={17} />
                        Diagnosis
                      </h4>

                      <p>{prescription.diagnosis}</p>

                    </div>
                  )}

                  {/* MEDICINES */}

                  {Array.isArray(prescription.medicines) &&
                    prescription.medicines.length > 0 && (

                      <div className="prescription-detail">

                        <h4>
                          <Pill size={17} />
                          Medicines
                        </h4>

                        <div className="prescription-medicines">

                          {prescription.medicines.map(
                            (medicine, medicineIndex) => (

                              <div
                                className="prescription-medicine"
                                key={medicineIndex}
                              >

                                <div className="medicine-heading">
                                  <div className="medicine-icon">
                                    <Pill size={17} />
                                  </div>

                                  <strong>
                                    {medicine.name || "Medicine"}
                                  </strong>
                                </div>

                                <div className="medicine-details">

                                  {medicine.dosage && (
                                    <span>
                                      Dosage: {medicine.dosage}
                                    </span>
                                  )}

                                  {medicine.frequency && (
                                    <span>
                                      Frequency: {medicine.frequency}
                                    </span>
                                  )}

                                  {medicine.duration && (
                                    <span>
                                      Duration: {medicine.duration}
                                    </span>
                                  )}

                                </div>

                                {medicine.instructions && (
                                  <div className="medicine-instructions">
                                    <strong>Instructions:</strong>
                                    <p>{medicine.instructions}</p>
                                  </div>
                                )}

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    )}

                  {/* DOCTOR NOTES */}

                  {prescription.notes && (
                    <div className="prescription-detail">

                      <h4>
                        <FileText size={17} />
                        Doctor's Notes
                      </h4>

                      <p>{prescription.notes}</p>

                    </div>
                  )}

                </article>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}