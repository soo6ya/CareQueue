import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  LayoutDashboard,
  Ticket,
  UserRound,
  XCircle,
} from "lucide-react";

import { useQueue } from "../context/QueueContext";
import { apiFetch } from "../utils/api";

import DashboardSidebar from "../components/DashboardSidebar";
import ProfileMenu from "../components/ProfileMenu";
import ThemeToggle from "../components/ThemeToggle";

import "./PatientHistory.css";

function PatientHistory() {
  const navigate = useNavigate();

  const {
    patientToken,
    queueData,
    clearPatientToken,
  } = useQueue();

  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load patient profile.
  useEffect(() => {
    const email = sessionStorage.getItem(
      "carequeue-current-patient"
    );

    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    const savedProfile = localStorage.getItem(
      `carequeue-profile-${email}`
    );

    if (!savedProfile) {
      navigate("/register", { replace: true });
      return;
    }

    try {
      setPatient(JSON.parse(savedProfile));
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Load patient history from backend.
  useEffect(() => {
    if (!patient) return;

    let isActive = true;

    const loadHistory = async () => {
      try {
        const response = await apiFetch(
          "/api/patient/history"
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load history: ${response.status}`
          );
        }

        const data = await response.json();

        if (isActive) {
          setHistory(
            Array.isArray(data) ? data : []
          );
        }
      } catch (error) {
        console.error(
          "Unable to load patient history:",
          error
        );
      } finally {
        if (isActive) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    const interval = setInterval(loadHistory, 5000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [patient]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Consulted":
        return "history-status consulted";

      case "In Progress":
        return "history-status in-progress";

      case "Left Queue":
        return "history-status left";

      default:
        return "history-status waiting";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Consulted":
        return <CheckCircle2 size={14} />;

      case "In Progress":
        return <Activity size={14} />;

      case "Left Queue":
        return <XCircle size={14} />;

      default:
        return <Clock3 size={14} />;
    }
  };

  // Book new token.
  const handleBookNewToken = () => {
    if (
      patientToken !== null &&
      patientToken !== undefined
    ) {
      const isConsulted =
        Number(patientToken) <
        Number(queueData.nowServing);

      if (!isConsulted) {
        navigate("/queue-status");
        return;
      }

      clearPatientToken();
    }

    navigate("/get-token");
  };

  if (!patient) {
    return (
      <div className="patient-history-page">
        <div className="history-loading-page">
          <History size={30} />
          <p>Loading your history...</p>
        </div>
      </div>
    );
  }

  const consultedCount = history.filter(
    (item) => item.status === "Consulted"
  ).length;

  const activeCount = history.filter(
    (item) =>
      item.status === "Waiting" ||
      item.status === "In Progress"
  ).length;

  const leftCount = history.filter(
    (item) => item.status === "Left Queue"
  ).length;

  const hasActiveToken =
    patientToken !== null &&
    patientToken !== undefined;

  const tokenAlreadyConsulted =
    hasActiveToken &&
    Number(patientToken) <
      Number(queueData.nowServing);

  return (
    <div className="patient-history-page">

      {/* HEADER */}

      <header className="dashboard-header">

        <div className="dashboard-header-left">

          <DashboardSidebar role="Patient" />

          <div className="dashboard-brand">
            <div className="dashboard-logo">
              CQ
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

      {/* MAIN CONTENT */}

      <main className="patient-history-container">

        <section className="history-welcome">

          <div className="history-welcome-icon">
            <History size={20} />
            <span>YOUR ACTIVITY</span>
          </div>

          <h1>My History</h1>

          <p>
            Keep track of your previous queue visits
            and consultation records.
          </p>

        </section>

        {/* SUMMARY CARDS */}

        <section className="history-summary-grid">

          <div className="history-summary-card">
            <div className="history-card-top">
              <span>Total Visits</span>
              <div className="history-card-icon purple">
                <CalendarDays size={19} />
              </div>
            </div>

            <strong>{history.length}</strong>

            <small>All queue visits</small>
          </div>

          <div className="history-summary-card">
            <div className="history-card-top">
              <span>Consulted</span>
              <div className="history-card-icon green">
                <CheckCircle2 size={19} />
              </div>
            </div>

            <strong>{consultedCount}</strong>

            <small>Completed consultations</small>
          </div>

          <div className="history-summary-card">
            <div className="history-card-top">
              <span>Active</span>
              <div className="history-card-icon orange">
                <Activity size={19} />
              </div>
            </div>

            <strong>{activeCount}</strong>

            <small>Waiting or in progress</small>
          </div>

          <div className="history-summary-card">
            <div className="history-card-top">
              <span>Left Queue</span>
              <div className="history-card-icon red">
                <XCircle size={19} />
              </div>
            </div>

            <strong>{leftCount}</strong>

            <small>Visits left before consultation</small>
          </div>

        </section>

        {/* HISTORY LIST */}

        <section className="history-list-section">

          <div className="history-list-heading">

            <div className="history-title-group">
              <div className="history-section-icon">
                <History size={20} />
              </div>

              <div>
                <h2>Visit Records</h2>

                <p>
                  Your queue activity and consultation status.
                </p>
              </div>
            </div>

            <div className="history-heading-actions">

              <button
                type="button"
                onClick={() =>
                  navigate("/patient-dashboard")
                }
                className="history-dashboard-button"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>

              <button
                type="button"
                onClick={handleBookNewToken}
                className="history-book-token-button"
              >
                <Ticket size={17} />

                {hasActiveToken && !tokenAlreadyConsulted
                  ? "View Current Token"
                  : "Book New Token"}
              </button>

            </div>

          </div>

          {historyLoading ? (

            <div className="history-empty-state">
              <div className="history-loading-icon">
                <History size={28} />
              </div>

              <h3>Loading History</h3>

              <p>
                Please wait while we load your visit records.
              </p>
            </div>

          ) : history.length === 0 ? (

            <div className="history-empty-state">

              <div className="history-empty-icon">
                <CalendarDays size={34} />
              </div>

              <h3>No History Yet</h3>

              <p>
                Your queue visits will appear here
                after you generate your first token.
              </p>

              <button
                type="button"
                onClick={handleBookNewToken}
              >
                <Ticket size={17} />
                Book Your First Token
              </button>

            </div>

          ) : (

            <div className="history-table-wrapper">

              <table className="patient-history-table">

                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Department / Doctor</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {history.map((item) => (

                    <tr key={item.id}>

                      <td>
                        <strong className="history-token">
                          A-{String(item.token).padStart(3, "0")}
                        </strong>
                      </td>

                      <td>
                        <div className="history-service">
                          <strong>
                            {item.department || "—"}
                          </strong>

                          <span>
                            <UserRound size={12} />
                            {item.doctor || "—"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="history-date">
                          {formatDate(item.createdAt)}
                        </span>
                      </td>

                      <td>
                        <span className="history-time">
                          <Clock3 size={13} />
                          {formatTime(item.createdAt)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={getStatusClass(item.status)}
                        >
                          {getStatusIcon(item.status)}
                          {item.status}
                        </span>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

          {!historyLoading && history.length > 0 && (
            <div className="history-footer">
              <span>
                Showing {history.length} visit
                {history.length !== 1 ? "s" : ""}
              </span>

              <span className="history-live-indicator">
                <span />
                Updates automatically
              </span>
            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default PatientHistory;