
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueue } from "../context/QueueContext";
import { apiFetch } from "../utils/api";

import {
  Activity,
  BellRing,
  CheckCircle2,
  Clock3,
  PauseCircle,
  Ticket,
  Stethoscope,
  ArrowLeft,
} from "lucide-react";

import "./QueueStatus.css";

const QueueStatus = () => {
  const navigate = useNavigate();

  const {
    queueData,
    patientToken,
    clearPatientToken,
  } = useQueue();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [completedConsultation, setCompletedConsultation] =
    useState(null);

  const {
    department,
    doctor,
    estimatedTime,
    nowServing,
    waitingTokens,
    waitingMeta,
    queuePaused,
    queuePausedAt,
    totalPausedMs,
    queueSessionId,
  } = queueData;

  const hasToken =
    patientToken !== null &&
    patientToken !== undefined;

  const tokenNumber = Number(patientToken);

  // Update the clock used for waiting progress.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Check consultation completion directly from the backend.
  useEffect(() => {
    if (!hasToken || !queueSessionId) {
      setCompletedConsultation(null);
      return;
    }

    let isActive = true;

    const checkConsultation = async () => {
      try {
        const response = await apiFetch("/api/consultations");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!Array.isArray(data) || !isActive) {
          return;
        }

        const matchingConsultation = data.find(
          (record) =>
            Number(record.token) === tokenNumber &&
            record.queueSessionId === queueSessionId
        );

        if (isActive) {
          setCompletedConsultation(
            matchingConsultation || null
          );
        }
      } catch (error) {
        console.error(
          "Unable to check consultation status:",
          error
        );
      }
    };

    checkConsultation();

    const interval = setInterval(checkConsultation, 3000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [hasToken, tokenNumber, queueSessionId]);

  const isConsulted = Boolean(completedConsultation);

  const servingNumber = Number(nowServing);

  const isCurrentlyServing =
    hasToken &&
    !isConsulted &&
    tokenNumber === servingNumber;

  const isWaiting =
    hasToken &&
    !isConsulted &&
    tokenNumber > servingNumber;

  const peopleAhead = isWaiting
    ? waitingTokens.filter(
        (token) => Number(token) < tokenNumber
      ).length + 1
    : 0;

  const patientMeta =
    waitingMeta?.[String(patientToken)] || null;

  const joinedAt = Number(patientMeta?.joinedAt);

  const initialAhead = Math.max(
    1,
    Number(patientMeta?.initialAhead) || peopleAhead
  );

  const estimatedWaitMinutes = Math.max(
    0,
    Number(patientMeta?.estimatedWaitMinutes) ||
      initialAhead * Math.max(Number(estimatedTime) || 0, 0)
  );

  const estimatedWaitMs = estimatedWaitMinutes * 60 * 1000;

  const pausedMsAtJoin = Math.max(
    0,
    Number(patientMeta?.pausedMsAtJoin) || 0
  );

  const effectiveCurrentTime =
    queuePaused && queuePausedAt
      ? Number(queuePausedAt)
      : currentTime;

  const pausedTimeSinceJoin = Math.max(
    0,
    Number(totalPausedMs) - pausedMsAtJoin
  );

  const hasValidJoinTime =
    Number.isFinite(joinedAt) && joinedAt > 0;

  const elapsedWaitingMs = hasValidJoinTime
    ? Math.max(
        0,
        effectiveCurrentTime -
          joinedAt -
          pausedTimeSinceJoin
      )
    : 0;

  const waitingProgress =
    estimatedWaitMs > 0 && hasValidJoinTime
      ? Math.min(
          100,
          (elapsedWaitingMs / estimatedWaitMs) * 100
        )
      : 0;

  const progress = isConsulted
    ? 100
    : isCurrentlyServing
      ? 100
      : isWaiting
        ? waitingProgress
        : 0;

  const calculatedWait =
    isCurrentlyServing || isConsulted
      ? 0
      : Math.max(
          0,
          Math.ceil(
            Math.max(
              0,
              estimatedWaitMs - elapsedWaitingMs
            ) / 60000
          )
        );

  let statusTitle = "";
  let statusMessage = "";
  let statusIcon = null;
  let statusClass = "";

  if (isConsulted) {
    statusTitle = "Consultation Completed!";
    statusMessage =
      "Your consultation has been completed. Thank you for visiting CareQueue.";
    statusIcon = <CheckCircle2 size={23} />;
    statusClass = "your-turn";
  } else if (queuePaused) {
    statusTitle = "Queue temporarily paused";
    statusMessage =
      "Your position is saved. Your estimated waiting progress will continue when service resumes.";
    statusIcon = <PauseCircle size={23} />;
    statusClass = "paused";
  } else if (isCurrentlyServing) {
    statusTitle = "It's your turn!";
    statusMessage =
      "Please proceed to the doctor's room. Your token is currently being served.";
    statusIcon = <Stethoscope size={23} />;
    statusClass = "your-turn";
  } else if (peopleAhead <= 1) {
    statusTitle = "You're next!";
    statusMessage =
      "You are next in the queue. Please stay ready.";
    statusIcon = <BellRing size={23} />;
    statusClass = "almost-next";
  } else {
    statusTitle = "You're moving closer";
    statusMessage =
      `${peopleAhead} ${
        peopleAhead === 1 ? "patient is" : "patients are"
      } ahead of you. Your estimated waiting progress is updating.`;
    statusIcon = <Clock3 size={23} />;
    statusClass = "moving";
  }

  const progressLabel = isConsulted
    ? "Consultation completed"
    : isCurrentlyServing
      ? "Your turn"
      : peopleAhead <= 1
        ? "You're next"
        : `${peopleAhead} people ahead`;

  const handleLeaveQueue = () => {
    const confirmed = window.confirm(
      "Are you sure you want to leave the queue?"
    );

    if (!confirmed) return;

    clearPatientToken();

    window.alert("You have left the queue.");

    navigate("/patient-dashboard");
  };

  const handleBookNewToken = () => {
    clearPatientToken();
    navigate("/get-token");
  };

  if (!hasToken) {
    return (
      <div className="queue-status-page">
        <header className="queue-status-header">
          <div
            className="queue-status-brand"
            onClick={() => navigate("/")}
          >
            <div className="queue-status-logo">
              <Activity size={22} />
            </div>

            <div>
              <h2>CareQueue</h2>
              <span>Digital Queue System</span>
            </div>
          </div>

          <button
            type="button"
            className="dashboard-btn"
            onClick={() => navigate("/patient-dashboard")}
          >
            Dashboard
          </button>
        </header>

        <main className="queue-status-container">
          <div className="queue-status-card no-token-card">
            <div className="no-token-icon">
              <Ticket size={34} />
            </div>

            <h2>No Active Token</h2>

            <p>
              You don't currently have a token in the queue.
            </p>

            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate("/get-token")}
            >
              <Ticket size={17} />
              Book New Token
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="queue-status-page">
      <header className="queue-status-header">
        <div
          className="queue-status-brand"
          onClick={() => navigate("/")}
        >
          <div className="queue-status-logo">
            <Activity size={22} />
          </div>

          <div>
            <h2>CareQueue</h2>
            <span>Digital Queue System</span>
          </div>
        </div>

        <button
          type="button"
          className="dashboard-btn"
          onClick={() => navigate("/patient-dashboard")}
        >
          Dashboard
        </button>
      </header>

      <main className="queue-status-container">
        <div className="queue-status-card">
          {/* Department */}
          <div className="queue-status-department">
            <div>
              <span className="section-label">DEPARTMENT</span>
              <h2>{department}</h2>

              <p className="queue-doctor-name">
                <Stethoscope size={14} />
                {doctor}
              </p>
            </div>

            <div
              className={`live-status ${
                queuePaused ? "offline" : ""
              }`}
            >
              <span className="live-dot"></span>
              {queuePaused ? "PAUSED" : "LIVE"}
            </div>
          </div>

          <div className="queue-divider"></div>

          {/* Personal token */}
          <div className="personal-token-section">
            <span className="section-label">YOUR TOKEN</span>

            <div className="personal-token">
              A-{String(patientToken).padStart(3, "0")}
            </div>

            <span className="token-caption">
              Keep your token ready
            </span>
          </div>

          {/* Queue statistics */}
          <div className="queue-stats">
            <div className="queue-stat">
              <span className="section-label">NOW SERVING</span>

              <strong>
                A-{String(nowServing).padStart(3, "0")}
              </strong>
            </div>

            <div className="queue-stat">
              <span className="section-label">PEOPLE AHEAD</span>
              <strong>{peopleAhead}</strong>
            </div>

            <div className="queue-stat">
              <span className="section-label">EST. WAIT</span>
              <strong>{calculatedWait} min</strong>
            </div>
          </div>

          {/* Progress */}
          <div className="queue-progress-section">
            <div className="queue-progress-header">
              <span>
                <Activity size={14} />
                Queue Progress
              </span>

              <strong>{progressLabel}</strong>
            </div>

            <div
              className="queue-progress-bar"
              role="progressbar"
              aria-label="Your queue progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className={`queue-progress-fill ${
                  progress >= 100 ? "progress-complete" : ""
                }`}
                style={{ width: `${progress}%` }}
              >
                {progress > 10 && progress < 100 && (
                  <span className="progress-shimmer"></span>
                )}
              </div>
            </div>

            <div className="queue-progress-footer">
              <span>{Math.round(progress)}% completed</span>

              {isWaiting && !queuePaused && (
                <span>~{calculatedWait} min remaining</span>
              )}

              {queuePaused && <span>Timer paused</span>}
            </div>
          </div>

          {/* Queue status message */}
          <div className={`queue-message-card ${statusClass}`}>
            <div className="queue-message-icon">
              {statusIcon}
            </div>

            <div className="queue-message-content">
              <h3>{statusTitle}</h3>
              <p>{statusMessage}</p>

              {!queuePaused && isWaiting && (
                <span className="queue-message-wait">
                  Estimated turn: ~{calculatedWait} minutes
                </span>
              )}

              {isCurrentlyServing && (
                <span className="queue-message-wait">
                  Please proceed now
                </span>
              )}

              {isConsulted && (
                <span className="queue-message-wait">
                  Your visit has been marked as Consulted.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="queue-status-actions">
          {isConsulted ? (
            <>
              <button
                type="button"
                className="back-dashboard-btn"
                onClick={() => navigate("/patient-dashboard")}
              >
                <ArrowLeft size={15} />
                Dashboard
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={handleBookNewToken}
              >
                <Ticket size={16} />
                Book New Token
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="back-dashboard-btn"
                onClick={() => navigate("/patient-dashboard")}
              >
                <ArrowLeft size={15} />
                Back to Dashboard
              </button>

              <button
                type="button"
                className="leave-queue-btn"
                onClick={handleLeaveQueue}
                disabled={!isWaiting}
              >
                Leave Queue
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default QueueStatus;
