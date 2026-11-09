import { useEffect, useState } from "react";
import {
  Building2,
  Ticket,
  UsersRound,
  Info,
  CheckCircle2,
  Plus,
  Minus,
  Play,
  Pause,
  ArrowRight,
  Pill,
  Trash2,
  BarChart3,
  Clock3,
  RefreshCw,
  Activity,
} from "lucide-react";

import { useQueue } from "../context/QueueContext";
import { apiFetch } from "../utils/api";
import "./AdminDashboard.css";

import ProfileMenu from "../components/ProfileMenu";
import ThemeToggle from "../components/ThemeToggle";
import DashboardSidebar from "../components/DashboardSidebar";

const CONSULTATION_STORAGE_KEY = "carequeue-consultations";

function readConsultations() {
  try {
    const data = JSON.parse(
      localStorage.getItem(CONSULTATION_STORAGE_KEY) || "[]"
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function AdminDashboard() {
  const {
    queueData,
    updateQueue,
    callNextPatient,
    addPatient,
    removePatient,
    resetQueue,
    toggleQueue,
  } = useQueue();

  const {
    department,
    doctor,
    estimatedTime,
    nowServing,
    waitingPatients,
    queuePaused,
    queueSessionId,
  } = queueData;

  const [departmentInput, setDepartmentInput] = useState(department);
  const [doctorInput, setDoctorInput] = useState(doctor);
  const [estimatedTimeInput, setEstimatedTimeInput] = useState(String(estimatedTime));
  const [nowServingInput, setNowServingInput] = useState(String(nowServing));
  const [resetTokenInput, setResetTokenInput] = useState(String(nowServing));

  const [consultationRecords, setConsultationRecords] =
    useState(readConsultations);

  // Today's queue analytics
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsLastUpdated, setAnalyticsLastUpdated] = useState(null);

  const [currentPatient, setCurrentPatient] = useState(null);
  const [isLoadingCurrentPatient, setIsLoadingCurrentPatient] =
    useState(false);
  const [patientLookupError, setPatientLookupError] = useState("");

  const [isSavingConsultation, setIsSavingConsultation] = useState(false);
  const [patientNameInput, setPatientNameInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const [medicines, setMedicines] = useState([
    {
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
    },
  ]);

  // Fetch the current patient.
  // Retry temporary 404 responses while the backend saves
  // the newly selected serving patient.
  useEffect(() => {
    if (Number(nowServing) === 0 || !queueSessionId) {
      setCurrentPatient(null);
      setPatientLookupError("");
      setIsLoadingCurrentPatient(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const fetchCurrentPatient = async () => {
      setIsLoadingCurrentPatient(true);
      setPatientLookupError("");
      setCurrentPatient(null);

      try {
        let response = null;
        let responseData = null;
        const maxAttempts = 5;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          if (!active) return;

          response = await apiFetch("/api/queue/current-patient", {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          });

          responseData = await response.json().catch(() => null);

          if (response.ok) break;

          if (response.status !== 404) {
            throw new Error(
              responseData?.message ||
                `Unable to retrieve patient details (${response.status}).`
            );
          }

          if (attempt < maxAttempts) {
            await new Promise((resolve) => window.setTimeout(resolve, 500));
          }
        }

        if (!active) return;

        if (!response || !response.ok) {
          throw new Error(
            responseData?.message ||
              "Patient details could not be loaded. Please refresh the dashboard."
          );
        }

        if (
          Number(responseData?.token) !== Number(nowServing) ||
          responseData?.queueSessionId !== queueSessionId
        ) {
          throw new Error(
            "Patient details do not match the current queue token. Please refresh the dashboard."
          );
        }

        const ticketStatus = String(
          responseData.ticketStatus || ""
        ).trim().toUpperCase();

        setCurrentPatient({
          ...responseData,
          email: responseData.email,
          patientName: responseData.name || "Registered Patient",
          record: {
            id: responseData.patientRecordId,
            status: ticketStatus || "UNKNOWN",
          },
          profile: {
            name: responseData.name || "",
            age: responseData.age ?? null,
            phone: responseData.phone || "",
            address: responseData.address || "",
          },
        });
      } catch (error) {
        if (!active || error.name === "AbortError") return;

        console.error("Current patient lookup error:", error);
        setCurrentPatient(null);
        setPatientLookupError(error.message);
      } finally {
        if (active) setIsLoadingCurrentPatient(false);
      }
    };

    fetchCurrentPatient();

    return () => {
      active = false;
      controller.abort();
    };
  }, [nowServing, queueSessionId]);

  const currentConsultation = consultationRecords.find(
    (record) =>
      Number(record.token) === Number(nowServing) &&
      record.queueSessionId === queueSessionId
  );

  const isConsultationCompleted = Boolean(currentConsultation);

  useEffect(() => {
    setPatientNameInput(currentPatient?.patientName || "");
    setReasonInput("");
    setDiagnosisInput("");
    setNotesInput("");

    setMedicines([
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
  }, [nowServing, queueSessionId, currentPatient?.record?.id]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === CONSULTATION_STORAGE_KEY) {
        setConsultationRecords(readConsultations());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Fetch today's analytics and refresh every 5 seconds.
  useEffect(() => {
    let active = true;

    const fetchAnalytics = async () => {
      try {
        const response = await apiFetch("/api/admin/queue-analytics", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message || "Unable to load queue analytics."
          );
        }

        if (!active) return;

        setAnalytics(data);
        setAnalyticsError("");
        setAnalyticsLastUpdated(new Date());
      } catch (error) {
        if (!active) return;

        console.error("Queue analytics error:", error);
        setAnalyticsError(error.message);
      } finally {
        if (active) setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();

    const intervalId = window.setInterval(fetchAnalytics, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setDepartmentInput(department);
    setDoctorInput(doctor);
    setEstimatedTimeInput(String(estimatedTime));
  }, [department, doctor, estimatedTime]);

  useEffect(() => {
    setNowServingInput(String(nowServing));
    setResetTokenInput(String(nowServing));
  }, [nowServing]);

  const handleSaveSettings = () => {
    const cleanedDepartment = departmentInput.trim();
    const cleanedDoctor = doctorInput.trim();
    const time = Number(estimatedTimeInput);

    if (!cleanedDepartment) {
      alert("Please enter a department name.");
      return;
    }

    if (!cleanedDoctor) {
      alert("Please enter a doctor name.");
      return;
    }

    if (!Number.isFinite(time) || time <= 0) {
      alert("Please enter a valid treatment time greater than 0.");
      return;
    }

    updateQueue({
      department: cleanedDepartment,
      doctor: cleanedDoctor,
      estimatedTime: time,
    });

    alert("Queue settings updated successfully.");
  };

  const handleSaveNowServing = () => {
    const value = Number(nowServingInput);

    if (!Number.isFinite(value) || value < 0) {
      alert("Please enter a valid Now Serving number.");
      return;
    }

    const confirmed = window.confirm(
      "Changing the serving token may mark the current patient and skipped tokens as Left Queue. Continue?"
    );

    if (!confirmed) return;
    updateQueue({ nowServing: Math.floor(value) });
  };

  const handleCallNext = () => {
    if (waitingPatients === 0) {
      alert("There are no waiting patients.");
      return;
    }

    if (queuePaused) {
      alert("Please resume the queue before calling a patient.");
      return;
    }

    if (Number(nowServing) !== 0 && !isConsultationCompleted) {
      alert(
        "Please complete the current patient's consultation before calling the next patient."
      );
      return;
    }

    callNextPatient();
  };

  const handleResetQueue = () => {
    const startingToken = Number(resetTokenInput);

    if (!Number.isFinite(startingToken) || startingToken < 0) {
      alert("Please enter a valid starting token.");
      return;
    }

    const formattedToken = String(
      Math.floor(startingToken)
    ).padStart(3, "0");

    const confirmed = window.confirm(
      `Reset the queue starting from A-${formattedToken}? All current waiting patients will be removed.`
    );

    if (!confirmed) return;

    resetQueue(Math.floor(startingToken));
    setNowServingInput(String(Math.floor(startingToken)));
    setResetTokenInput(String(Math.floor(startingToken)));

    alert("Queue has been reset successfully.");
  };

  const handleMedicineChange = (index, field, value) => {
    setMedicines((previous) =>
      previous.map((medicine, medicineIndex) =>
        medicineIndex === index
          ? { ...medicine, [field]: value }
          : medicine
      )
    );
  };

  const handleAddMedicine = () => {
    setMedicines((previous) => [
      ...previous,
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
      },
    ]);
  };

  const handleRemoveMedicine = (index) => {
    setMedicines((previous) =>
      previous.filter((_, medicineIndex) => medicineIndex !== index)
    );
  };

  const handleCompleteConsultation = async () => {
    if (isSavingConsultation) return;

    if (isConsultationCompleted) {
      alert("This consultation has already been completed.");
      return;
    }

    if (!reasonInput.trim()) {
      alert("Please enter the reason for the patient's visit.");
      return;
    }

    const patientEmail = currentPatient?.email?.trim();

    if (!patientEmail) {
      alert(
        "This patient is not linked to a registered patient account. " +
        "For now, only patients with a registered email can have consultations " +
        "saved to the database. Walk-in patient support will be added separately."
      );
      return;
    }

    const validMedicines = medicines
      .filter((medicine) => medicine.name.trim())
      .map((medicine) => ({
        name: medicine.name.trim(),
        dosage: medicine.dosage.trim(),
        frequency: medicine.frequency.trim(),
        duration: medicine.duration.trim(),
        instructions: medicine.instructions.trim(),
      }));

    const confirmed = window.confirm(
      "Are you sure you want to complete this consultation and save the prescription?"
    );

    if (!confirmed) return;

    const completedAt = new Date().toISOString();
    const patientProfile = currentPatient?.profile || {};

    const patientName =
      patientNameInput.trim() ||
      currentPatient?.patientName ||
      "Registered Patient";

    const consultationPayload = {
      token: Number(nowServing),
      queueSessionId,
      patientRecordId: currentPatient?.record?.id || null,
      patientEmail,
      patientName,
      patientDetails: {
        name: patientName,
        age: patientProfile.age ?? null,
        phone:
          patientProfile.phone ||
          patientProfile.phoneNumber ||
          patientProfile.mobile ||
          patientProfile.mobileNumber ||
          "",
        email: patientEmail,
        address:
          patientProfile.address ||
          patientProfile.fullAddress ||
          patientProfile.residentialAddress ||
          "",
      },
      department,
      doctor,
      reason: reasonInput.trim(),
      diagnosis: diagnosisInput.trim(),
      notes: notesInput.trim(),
      medicines: validMedicines,
      consultationAt: completedAt,
      completedAt,
    };

    setIsSavingConsultation(true);

    try {
      const response = await apiFetch("/api/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(consultationPayload),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          responseData?.message ||
          (response.status === 409
            ? "This consultation has already been saved in the database."
            : `Server error (${response.status}).`);

        throw new Error(message);
      }

      const savedConsultation = {
        ...consultationPayload,
        ...responseData,
        id: responseData?.id ?? `${Date.now()}-${nowServing}`,
      };

      const existingRecords = readConsultations();

      const updatedConsultations = [
        savedConsultation,
        ...existingRecords.filter(
          (record) =>
            !(
              Number(record.token) === Number(nowServing) &&
              record.queueSessionId === queueSessionId
            )
        ),
      ];

      localStorage.setItem(
        CONSULTATION_STORAGE_KEY,
        JSON.stringify(updatedConsultations)
      );

      if (currentPatient?.email && currentPatient?.record?.id) {
        const historyKey = `carequeue-history-${currentPatient.email}`;

        const history = JSON.parse(
          localStorage.getItem(historyKey) || "[]"
        );

        const updatedHistory = history.map((record) =>
          record.id === currentPatient.record.id
            ? {
                ...record,
                status: "Consulted",
                completedAt,
                consultation: savedConsultation,
              }
            : record
        );

        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      }

      setConsultationRecords(updatedConsultations);

      alert(
        "Consultation and prescription saved successfully to the database!"
      );
    } catch (error) {
      console.error("Consultation database save error:", error);
      alert(
        `Unable to save the consultation to the database. ${
          error.message ||
          "Please check that the backend is running and try again."
        }`
      );
    } finally {
      setIsSavingConsultation(false);
    }
  };

  const formatConsultationTime = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleString();
  };

  const displayedPatientStatus =
    currentPatient?.record?.status || "Serving";

  const hourlyArrivals = analytics?.hourlyArrivals || [];

  const maxHourlyArrivals = Math.max(
    1,
    ...hourlyArrivals.map((item) => Number(item.count) || 0)
  );

  const completionPercentage =
    analytics?.totalPatientsJoined > 0
      ? Math.min(
          100,
          Math.round(
            (analytics.completedConsultations /
              analytics.totalPatientsJoined) *
              100
          )
        )
      : 0;

  return (
    <div className="admin-dashboard-page">
      <header className="admin-header">
        <div className="admin-header-left">
          <DashboardSidebar role="Admin" />

          <div className="admin-brand">
            <div className="admin-logo">CQ</div>
            <div>
              <h2>CareQueue</h2>
              <p>Admin Control Panel</p>
            </div>
          </div>
        </div>

        <div className="admin-header-status">
          <span className={queuePaused ? "admin-status paused" : "admin-status"}>
            <span></span>
            {queuePaused ? "Queue Paused" : "Queue Live"}
          </span>

          <ThemeToggle />
          <ProfileMenu role="Admin" name="Administrator" />
        </div>
      </header>

      <main className="admin-dashboard-container">
        <section className="admin-page-heading">
          <div>
            <span className="admin-label">ADMIN DASHBOARD</span>
            <h1>Queue Management</h1>
            <p>Manage the live hospital queue and control patient flow.</p>
          </div>
        </section>

        <section className="admin-summary-grid">
          <div className="admin-summary-card">
            <span>DEPARTMENT</span>
            <strong>{department}</strong>
          </div>
          <div className="admin-summary-card">
            <span>DOCTOR</span>
            <strong>{doctor}</strong>
          </div>
          <div className="admin-summary-card">
            <span>NOW SERVING</span>
            <strong>A-{String(nowServing).padStart(3, "0")}</strong>
          </div>
          <div className="admin-summary-card">
            <span>WAITING</span>
            <strong>{waitingPatients}</strong>
          </div>
        </section>

        {/* TODAY'S QUEUE ANALYTICS */}
        <section className="admin-analytics-section">
          <div className="admin-analytics-heading">
            <div>
              <span className="admin-label">TODAY'S OVERVIEW</span>
              <h2>Queue Analytics</h2>
              <p>
                Patient arrivals and consultation activity for {" "}
                {analytics?.date || "today"}.
              </p>
            </div>

            <div className="admin-analytics-refresh">
              <RefreshCw
                size={16}
                className={analyticsLoading ? "analytics-spinning" : ""}
              />
              <span>
                {analyticsLastUpdated
                  ? `Updated ${analyticsLastUpdated.toLocaleTimeString()}`
                  : "Loading analytics"}
              </span>
            </div>
          </div>

          {analyticsError && !analytics && (
            <div className="admin-analytics-message">
              {analyticsError}
            </div>
          )}

          {analyticsLoading && !analytics ? (
            <div className="admin-analytics-message">
              Loading today's analytics...
            </div>
          ) : analytics ? (
            <>
              <div className="admin-analytics-summary">
                <div className="admin-analytics-card">
                  <div className="admin-analytics-card-icon">
                    <UsersRound size={21} />
                  </div>
                  <span>TOTAL PATIENTS TODAY</span>
                  <strong>{analytics.totalPatientsJoined}</strong>
                  <small>Patients who joined the queue</small>
                </div>

                <div className="admin-analytics-card">
                  <div className="admin-analytics-card-icon">
                    <CheckCircle2 size={21} />
                  </div>
                  <span>COMPLETED CONSULTATIONS</span>
                  <strong>{analytics.completedConsultations}</strong>
                  <small>Consultations completed today</small>
                </div>

                <div className="admin-analytics-card">
                  <div className="admin-analytics-card-icon">
                    <Clock3 size={21} />
                  </div>
                  <span>CURRENTLY WAITING</span>
                  <strong>{analytics.currentlyWaiting}</strong>
                  <small>Patients waiting in the active queue</small>
                </div>
              </div>

              <div className="admin-analytics-details">
                <div className="admin-analytics-chart-card">
                  <div className="admin-analytics-card-heading">
                    <div className="admin-analytics-card-icon">
                      <BarChart3 size={21} />
                    </div>
                    <div>
                      <h3>Hourly Patient Arrivals</h3>
                      <p>Number of patients joining each hour</p>
                    </div>
                  </div>

                  {hourlyArrivals.length > 0 ? (
                    <div className="admin-hourly-chart">
                      {hourlyArrivals.map((item, index) => {
                        const count = Number(item.count) || 0;
                        const height =
                          count === 0
                            ? 3
                            : Math.max(
                                8,
                                (count / maxHourlyArrivals) * 100
                              );

                        return (
                          <div
                            className="admin-hourly-bar-item"
                            key={`${item.hour}-${index}`}
                            title={`${item.hour}: ${count} patients`}
                          >
                            <span className="admin-hourly-count">
                              {count > 0 ? count : ""}
                            </span>

                            <div className="admin-hourly-bar-track">
                              <div
                                className={`admin-hourly-bar ${
                                  count > 0 ? "has-arrivals" : ""
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            </div>

                            <span className="admin-hourly-label">
                              {item.hour}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="admin-analytics-message">
                      No hourly arrival data is available.
                    </p>
                  )}
                </div>

                <div className="admin-analytics-progress-card">
                  <div className="admin-analytics-card-heading">
                    <div className="admin-analytics-card-icon">
                      <Activity size={21} />
                    </div>
                    <div>
                      <h3>Consultation Progress</h3>
                      <p>Completed consultations compared with arrivals</p>
                    </div>
                  </div>

                  <div className="admin-progress-value">
                    <strong>{completionPercentage}%</strong>
                    <span>of today's arrivals</span>
                  </div>

                  <div className="admin-progress-track">
                    <div
                      className="admin-progress-fill"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>

                  <div className="admin-progress-footer">
                    <span>
                      {analytics.completedConsultations} completed
                    </span>
                    <span>
                      {analytics.totalPatientsJoined} arrivals
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className="admin-consultation-card">
          <div className="admin-consultation-heading">
            <div>
              <span className="admin-label">PATIENT CONSULTATION</span>
              <h2>Current Patient Consultation</h2>
              <p>Record the patient's visit details and prescription.</p>
            </div>
            <div className="admin-consultation-token">
              A-{String(nowServing).padStart(3, "0")}
            </div>
          </div>

          {Number(nowServing) === 0 ? (
            <div className="admin-consultation-completed">
              <span><Info size={20} /></span>
              <div>
                <strong>No Patient Currently Serving</strong>
                <p>Call the first waiting patient to begin a consultation.</p>
              </div>
            </div>
          ) : isConsultationCompleted ? (
            <div className="admin-consultation-completed">
              <span><CheckCircle2 size={20} /></span>
              <div>
                <strong>Consultation Completed</strong>
                <p>This patient's consultation has already been saved.</p>
                <small>
                  Completed:{" "}
                  {formatConsultationTime(currentConsultation.completedAt)}
                </small>
              </div>
            </div>
          ) : (
            <>
              <div className="admin-consultation-patient">
                <div>
                  <span>NOW SERVING</span>
                  <strong>A-{String(nowServing).padStart(3, "0")}</strong>
                </div>

                <div>
                  <span>PATIENT NAME</span>
                  <strong>
                    {isLoadingCurrentPatient
                      ? "Loading patient details..."
                      : currentPatient?.patientName ||
                        (patientLookupError
                          ? "Unable to load patient"
                          : "No registered patient linked")}
                  </strong>

                  {currentPatient && (
                    <small style={{ display: "block", marginTop: "6px" }}>
                      Age:{" "}
                      {currentPatient.profile.age != null
                        ? `${currentPatient.profile.age} years`
                        : "Not available"}
                    </small>
                  )}
                </div>

                <div>
                  <span>STATUS</span>
                  <strong>{displayedPatientStatus}</strong>
                </div>
              </div>

              {!currentPatient && !isLoadingCurrentPatient && (
                <p className="admin-consultation-notice">
                  {patientLookupError ||
                    "No registered patient profile is linked to this token."}
                </p>
              )}

              <div className="admin-consultation-form">
                <div className="admin-consultation-field">
                  <label>Patient Name</label>
                  <input
                    type="text"
                    value={patientNameInput}
                    onChange={(event) => setPatientNameInput(event.target.value)}
                    placeholder="Enter patient name"
                  />
                </div>

                <div className="admin-consultation-field full-width">
                  <label>Reason for Visit <span>*</span></label>
                  <textarea
                    value={reasonInput}
                    onChange={(event) => setReasonInput(event.target.value)}
                    placeholder="Enter the patient's symptoms or reason for visiting..."
                    rows="3"
                  />
                </div>

                <div className="admin-consultation-field full-width">
                  <label>Diagnosis</label>
                  <textarea
                    value={diagnosisInput}
                    onChange={(event) => setDiagnosisInput(event.target.value)}
                    placeholder="Enter the doctor's diagnosis..."
                    rows="3"
                  />
                </div>

                <div className="admin-consultation-field full-width">
                  <label>Doctor's Notes</label>
                  <textarea
                    value={notesInput}
                    onChange={(event) => setNotesInput(event.target.value)}
                    placeholder="Additional observations or advice..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="admin-prescription-section">
                <div className="admin-prescription-heading">
                  <div>
                    <span className="admin-label">MEDICATION</span>
                    <h3>Prescription</h3>
                    <p>Add one or more medicines. Prescription is optional.</p>
                  </div>

                  <button
                    type="button"
                    className="admin-add-medicine-btn"
                    onClick={handleAddMedicine}
                  >
                    <Plus size={16} /> Add Medicine
                  </button>
                </div>

                {medicines.map((medicine, index) => (
                  <div className="admin-medicine-card" key={index}>
                    <div className="admin-medicine-title">
                      <strong>
                        <Pill size={16} /> Medicine {index + 1}
                      </strong>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(index)}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>

                    <div className="admin-medicine-grid">
                      <div className="admin-consultation-field full-width">
                        <label>Medicine Name</label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(event) =>
                            handleMedicineChange(index, "name", event.target.value)
                          }
                          placeholder="Enter medicine name"
                        />
                      </div>

                      <div className="admin-consultation-field">
                        <label>Dosage</label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(event) =>
                            handleMedicineChange(index, "dosage", event.target.value)
                          }
                          placeholder="e.g. 500 mg"
                        />
                      </div>

                      <div className="admin-consultation-field">
                        <label>Frequency</label>
                        <input
                          type="text"
                          value={medicine.frequency}
                          onChange={(event) =>
                            handleMedicineChange(index, "frequency", event.target.value)
                          }
                          placeholder="e.g. Twice daily"
                        />
                      </div>

                      <div className="admin-consultation-field">
                        <label>Duration</label>
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(event) =>
                            handleMedicineChange(index, "duration", event.target.value)
                          }
                          placeholder="e.g. 5 days"
                        />
                      </div>

                      <div className="admin-consultation-field">
                        <label>Instructions</label>
                        <input
                          type="text"
                          value={medicine.instructions}
                          onChange={(event) =>
                            handleMedicineChange(index, "instructions", event.target.value)
                          }
                          placeholder="e.g. After food"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-consultation-footer">
                <p>
                  Date and time will be recorded automatically when the
                  consultation is completed.
                </p>

                <button
                  type="button"
                  className="admin-complete-consultation-btn"
                  onClick={handleCompleteConsultation}
                  disabled={isSavingConsultation}
                >
                  {isSavingConsultation
                    ? "Saving Consultation..."
                    : <><CheckCircle2 size={17} /> Complete Consultation</>}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="admin-controls-grid">
          <div className="admin-control-card">
            <div className="admin-card-heading">
              <div>
                <span>QUEUE SETTINGS</span>
                <h2>Department & Doctor</h2>
              </div>
              <div className="control-icon"><Building2 size={22} /></div>
            </div>

            <div className="admin-settings-form">
              <div className="admin-form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={departmentInput}
                  onChange={(event) => setDepartmentInput(event.target.value)}
                  placeholder="Enter department"
                />
              </div>

              <div className="admin-form-group">
                <label>Doctor</label>
                <input
                  type="text"
                  value={doctorInput}
                  onChange={(event) => setDoctorInput(event.target.value)}
                  placeholder="Enter doctor name"
                />
              </div>

              <div className="admin-form-group">
                <label>Estimated Treatment Time</label>
                <div className="admin-input-with-suffix">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={estimatedTimeInput}
                    onChange={(event) =>
                      setEstimatedTimeInput(event.target.value)
                    }
                  />
                  <span>min</span>
                </div>
              </div>
            </div>

            <button className="save-settings-btn" onClick={handleSaveSettings}>
              Save Queue Settings
            </button>

            <p className="admin-help-text">
              Changes will immediately appear on the patient dashboard.
            </p>
          </div>

          <div className="admin-control-card">
            <div className="admin-card-heading">
              <div>
                <span>CURRENT CONTROL</span>
                <h2>Now Serving</h2>
              </div>
              <div className="control-icon"><Ticket size={22} /></div>
            </div>

            <div className="current-token-box">
              <span>CURRENT TOKEN</span>
              <strong>A-{String(nowServing).padStart(3, "0")}</strong>
              <small>
                {waitingPatients}{" "}
                {waitingPatients === 1 ? "patient" : "patients"} waiting
              </small>
            </div>

            <div className="admin-form-group">
              <label>Set Now Serving</label>
              <div className="admin-input-row">
                <input
                  type="number"
                  min="0"
                  value={nowServingInput}
                  onChange={(event) => setNowServingInput(event.target.value)}
                />
                <button onClick={handleSaveNowServing}>Update</button>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-control-card waiting-control-card">
          <div className="admin-card-heading">
            <div>
              <span>WAITING PATIENTS</span>
              <h2>{waitingPatients}</h2>
            </div>
            <div className="control-icon"><UsersRound size={22} /></div>
          </div>

          <div className="waiting-control">
            <button
              onClick={removePatient}
              disabled={waitingPatients === 0}
              aria-label="Remove patient"
            >
              <Minus size={18} />
            </button>
            <div className="waiting-number">{waitingPatients}</div>
            <button onClick={addPatient} aria-label="Add patient">
              <Plus size={18} />
            </button>
          </div>

          <p className="admin-help-text">
            Use these controls for manual queue adjustments.
          </p>
        </section>

        <section className="admin-action-card">
          <div>
            <span className="admin-label">QUEUE ACTION</span>
            <h2>Call Next Patient</h2>
            <p>
              Move the first waiting patient to the currently serving position.
            </p>
            <p className="admin-help-text">
              Global estimated treatment time: {estimatedTime} min
            </p>
          </div>

          <button
            className="call-next-btn"
            onClick={handleCallNext}
            disabled={
              queuePaused ||
              waitingPatients === 0 ||
              (Number(nowServing) !== 0 && !isConsultationCompleted)
            }
          >
            Call Next Patient <ArrowRight size={18} />
          </button>
        </section>

        <section className="admin-secondary-actions">
          <button
            className={queuePaused ? "pause-btn resume" : "pause-btn"}
            onClick={toggleQueue}
          >
            {queuePaused
              ? <><Play size={16} /> Resume Queue</>
              : <><Pause size={16} /> Pause Queue</>}
          </button>
        </section>

        <section className="admin-reset-card">
          <div className="reset-card-content">
            <span className="admin-label">QUEUE RESET</span>
            <h2>Start a Fresh Queue</h2>
            <p>
              Reset all waiting patients and restart token generation from
              the selected Now Serving number.
            </p>
          </div>

          <div className="reset-controls">
            <label>Starting Now Serving</label>
            <div className="reset-input-row">
              <input
                type="number"
                min="0"
                value={resetTokenInput}
                onChange={(event) => setResetTokenInput(event.target.value)}
              />
              <button className="reset-queue-btn" onClick={handleResetQueue}>
                Reset Queue
              </button>
            </div>
            <small>
              Example: reset to 001 → first new patient receives A-002.
            </small>
          </div>
        </section>

        <section className="admin-live-section">
          <div className="admin-live-heading">
            <div>
              <span className="admin-label">LIVE QUEUE</span>
              <h2>Current Queue Information</h2>
            </div>

            <span
              className={
                queuePaused ? "admin-live-badge paused" : "admin-live-badge"
              }
            >
              {queuePaused ? "PAUSED" : "LIVE"}
            </span>
          </div>

          <div className="admin-live-grid">
            <div>
              <span>DEPARTMENT</span>
              <strong>{department}</strong>
            </div>
            <div>
              <span>DOCTOR</span>
              <strong>{doctor}</strong>
            </div>
            <div>
              <span>NOW SERVING</span>
              <strong>A-{String(nowServing).padStart(3, "0")}</strong>
            </div>
            <div>
              <span>WAITING</span>
              <strong>{waitingPatients}</strong>
            </div>
            <div>
              <span>EST. TIME</span>
              <strong>{estimatedTime} min</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;