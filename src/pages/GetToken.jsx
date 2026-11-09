
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueue } from "../context/QueueContext";

import {
  Activity,
  Ticket,
  Clock3,
  Users,
  Stethoscope,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

import "./GetToken.css";

function GetToken() {
  const navigate = useNavigate();

  const {
    queueData,
    patientToken,
    generateToken,
  } = useQueue();

  const {
    department,
    doctor,
    estimatedTime,
    nowServing,
    waitingPatients,
    queuePaused,
  } = queueData;

  const [confirmed, setConfirmed] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(patientToken);

  const hasActiveToken =
    patientToken !== null &&
    patientToken !== undefined;

  // Estimated wait for a new patient.
  const estimatedJoinWait =
    (waitingPatients + 1) * estimatedTime;

  const handleGenerateToken = () => {
    if (queuePaused) {
      alert(
        "The queue is currently paused. Please try again when the queue resumes."
      );
      return;
    }

    if (hasActiveToken) {
      navigate("/queue-status");
      return;
    }

    if (!confirmed) {
      alert(
        "Please confirm the queue information before generating your token."
      );
      return;
    }

    const token = generateToken();

    setGeneratedToken(token);

    setTimeout(() => {
      navigate("/queue-status");
    }, 500);
  };

  return (
    <div className="get-token-page">

      {/* Header */}
      <header className="get-token-header">
        <div
          className="get-token-brand"
          onClick={() => navigate("/")}
        >
          <div className="get-token-logo">
            <Activity size={22} />
          </div>

          <div>
            <h2>CareQueue</h2>
            <p>Digital Queue System</p>
          </div>
        </div>

        <button
          type="button"
          className="get-token-back-btn"
          onClick={() => navigate("/patient-dashboard")}
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>
      </header>

      {/* Main */}
      <main className="get-token-container">

        <div className="get-token-title">
          <span className="get-token-title-tag">
            PATIENT SERVICES
          </span>

          <h1>Get Your Token</h1>

          <p>Join the hospital queue digitally.</p>
        </div>

        <section className="get-token-card">

          {/* Department */}
          <div className="service-header">
            <div>
              <span className="service-label">
                DEPARTMENT
              </span>

              <h2>{department}</h2>

              <p className="service-doctor">
                <Stethoscope size={15} />
                {doctor}
              </p>
            </div>

            <div
              className={`queue-status-small ${
                queuePaused ? "paused" : ""
              }`}
            >
              <span></span>
              {queuePaused ? "PAUSED" : "QUEUE OPEN"}
            </div>
          </div>

          {/* Current Queue */}
          <div className="queue-preview">
            <div className="queue-preview-heading">
              <div className="queue-preview-icon">
                <Activity size={17} />
              </div>

              <div>
                <h3>Current Queue</h3>
                <p>Live hospital queue information</p>
              </div>

              <span className={`queue-preview-live ${
                queuePaused ? "paused" : ""
              }`}>
                {queuePaused ? "Paused" : "Live"}
              </span>
            </div>

            <div className="preview-grid">
              <div className="preview-stat">
                <span>
                  <Stethoscope size={13} />
                  NOW SERVING
                </span>

                <strong>
                  A-{String(nowServing).padStart(3, "0")}
                </strong>
              </div>

              <div className="preview-stat">
                <span>
                  <Users size={13} />
                  WAITING PATIENTS
                </span>

                <strong>{waitingPatients}</strong>
              </div>

              <div className="preview-stat">
                <span>
                  <Clock3 size={13} />
                  EST. WAIT
                </span>

                <strong>{estimatedJoinWait} min</strong>
              </div>
            </div>
          </div>

          {/* Existing Token */}
          {hasActiveToken ? (
            <div className="generated-token-message">
              <div className="generated-token-icon">
                <CheckCircle2 size={20} />
              </div>

              <div className="generated-token-details">
                <span>You already have an active token</span>

                <strong>
                  A-{String(patientToken).padStart(3, "0")}
                </strong>
              </div>
            </div>
          ) : (
            <label className="token-confirmation">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />

              <span>
                I confirm that I want to join the{" "}
                <strong>{department}</strong> queue for{" "}
                <strong>{doctor}</strong>.
              </span>
            </label>
          )}

          {/* Newly Generated Token */}
          {generatedToken && !hasActiveToken && (
            <div className="generated-token-message">
              <div className="generated-token-icon">
                <Ticket size={20} />
              </div>

              <div className="generated-token-details">
                <span>Your token</span>

                <strong>
                  A-{String(generatedToken).padStart(3, "0")}
                </strong>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            className="generate-token-btn"
            onClick={handleGenerateToken}
            disabled={
              queuePaused ||
              (!hasActiveToken && !confirmed)
            }
          >
            {hasActiveToken ? (
              <>
                View My Queue Status
                <ArrowLeft size={16} className="token-button-arrow" />
              </>
            ) : (
              <>
                <Ticket size={17} />
                Generate My Token
              </>
            )}
          </button>

          {queuePaused && (
            <p className="queue-paused-note">
              <Clock3 size={14} />
              The queue is currently paused by the hospital.
            </p>
          )}

        </section>
      </main>
    </div>
  );
}

export default GetToken;
