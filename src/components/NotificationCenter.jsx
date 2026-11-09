
import { useEffect, useRef, useState } from "react";
import "./NotificationCenter.css";
import { enablePushNotifications } from "../services/pushNotifications";
import { Bell } from "lucide-react";

const CONSULTATION_STORAGE_KEY = "carequeue-consultations";

function getPatientEmail() {
  return sessionStorage.getItem("carequeue-current-patient");
}

function getNotificationKey(email) {
  return `carequeue-notifications-${email}`;
}

function readNotifications(email) {
  if (!email) return [];

  try {
    const saved = localStorage.getItem(getNotificationKey(email));
    const parsed = JSON.parse(saved || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotifications(email, notifications) {
  if (!email) return;

  localStorage.setItem(
    getNotificationKey(email),
    JSON.stringify(notifications)
  );
}

function createNotification(type, title, message, id) {
  return {
    id,
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

function NotificationCenter({ queueData, patientToken }) {
  const [email, setEmail] = useState(getPatientEmail);

  const [notifications, setNotifications] = useState(() =>
    readNotifications(getPatientEmail())
  );

  const [isOpen, setIsOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  const [pushBusy, setPushBusy] = useState(false);

  const previousSnapshot = useRef(null);
  const previousToken = useRef(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // Refresh when the active patient changes.
  useEffect(() => {
    const refreshPatient = () => {
      const currentEmail = getPatientEmail();

      setEmail(currentEmail);
      setNotifications(readNotifications(currentEmail));

      previousSnapshot.current = null;
      previousToken.current = null;
      setPushStatus("");
    };

    window.addEventListener("focus", refreshPatient);

    return () => {
      window.removeEventListener("focus", refreshPatient);
    };
  }, []);

  // Synchronize notifications between browser tabs.
  useEffect(() => {
    if (!email) return;

    const handleStorage = (event) => {
      if (
        event.key === getNotificationKey(email) ||
        event.key === null
      ) {
        setNotifications(readNotifications(email));
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [email]);

  const addNotification = (notification) => {
    if (!email) return;

    const current = readNotifications(email);

    if (current.some((item) => item.id === notification.id)) {
      return;
    }

    const updated = [notification, ...current].slice(0, 50);

    saveNotifications(email, updated);
    setNotifications(updated);
  };

  // Detect queue changes for the current patient's token.
  useEffect(() => {
    if (
      !email ||
      patientToken === null ||
      patientToken === undefined
    ) {
      previousSnapshot.current = null;
      previousToken.current = null;
      return;
    }

    const token = Number(patientToken);
    const sessionId = queueData.queueSessionId;

    if (!Number.isFinite(token) || !sessionId) return;

    const snapshot = {
      sessionId,
      nowServing: Number(queueData.nowServing),
      waitingTokens: queueData.waitingTokens || [],
      queuePaused: Boolean(queueData.queuePaused),
      queuePausedAt: queueData.queuePausedAt,
      totalPausedMs: queueData.totalPausedMs,
    };

    const previous = previousSnapshot.current;

    // First load or new queue session: establish a baseline.
    if (
      !previous ||
      previous.sessionId !== snapshot.sessionId ||
      previousToken.current !== token
    ) {
      previousSnapshot.current = snapshot;
      previousToken.current = token;
      return;
    }

    const isNowServing = snapshot.nowServing === token;
    const wasServing = previous.nowServing === token;

    if (isNowServing && !wasServing) {
      addNotification(
        createNotification(
          "turn",
          "It's your turn!",
          `Your token A-${String(token).padStart(3, "0")} is now being served. Please proceed to the doctor's room.`,
          `turn-${sessionId}-${token}`
        )
      );
    } else {
      const previousAhead =
        previous.nowServing < token
          ? previous.waitingTokens.filter(
              (item) => Number(item) < token
            ).length + 1
          : 0;

      const currentAhead =
        snapshot.nowServing < token
          ? snapshot.waitingTokens.filter(
              (item) => Number(item) < token
            ).length + 1
          : 0;

      if (
        previousAhead > 1 &&
        currentAhead <= 1 &&
        currentAhead > 0
      ) {
        addNotification(
          createNotification(
            "next",
            "You're next in the queue!",
            "Please stay ready. Your turn is approaching.",
            `next-${sessionId}-${token}-${snapshot.nowServing}`
          )
        );
      }
    }

    // Queue paused notification.
    if (snapshot.queuePaused && !previous.queuePaused) {
      addNotification(
        createNotification(
          "paused",
          "Queue paused",
          "The hospital queue has been temporarily paused. Your position is saved.",
          `paused-${sessionId}-${snapshot.queuePausedAt}`
        )
      );
    }

    // Queue resumed notification.
    if (!snapshot.queuePaused && previous.queuePaused) {
      addNotification(
        createNotification(
          "resumed",
          "Queue resumed",
          "The hospital queue has resumed. Your position is unchanged.",
          `resumed-${sessionId}-${snapshot.totalPausedMs}`
        )
      );
    }

    previousSnapshot.current = snapshot;
  }, [queueData, patientToken, email]);

  // Detect consultation completion.
  useEffect(() => {
    if (
      !email ||
      patientToken === null ||
      patientToken === undefined
    ) {
      return;
    }

    const checkConsultation = () => {
      try {
        const records = JSON.parse(
          localStorage.getItem(CONSULTATION_STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(records)) return;

        const consultation = records.find(
          (record) =>
            Number(record.token) === Number(patientToken) &&
            record.queueSessionId === queueData.queueSessionId &&
            record.patientEmail === email
        );

        if (consultation) {
          addNotification(
            createNotification(
              "completed",
              "Consultation completed",
              "Your consultation has been completed. Thank you for visiting CareQueue.",
              `completed-${consultation.id}`
            )
          );
        }
      } catch (error) {
        console.error(
          "Consultation notification error:",
          error
        );
      }
    };

    checkConsultation();

    const handleStorage = (event) => {
      if (
        event.key === CONSULTATION_STORAGE_KEY ||
        event.key === null
      ) {
        checkConsultation();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", checkConsultation);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", checkConsultation);
    };
  }, [email, patientToken, queueData.queueSessionId]);

  // Mark all notifications as read.
  const markAllAsRead = () => {
    const updated = notifications.map((item) => ({
      ...item,
      read: true,
    }));

    saveNotifications(email, updated);
    setNotifications(updated);
  };

  // Mark an individual notification as read.
  const markAsRead = (id) => {
    const updated = notifications.map((item) =>
      item.id === id ? { ...item, read: true } : item
    );

    saveNotifications(email, updated);
    setNotifications(updated);
  };

  // Clear all notifications.
  const clearNotifications = () => {
    saveNotifications(email, []);
    setNotifications([]);
  };

  const formatTime = (date) => {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "";

    return parsed.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Enable device push notifications using the saved JWT.
  const handleEnablePush = async () => {
    setPushBusy(true);
    setPushStatus("");

    try {
      const accessToken = sessionStorage.getItem(
        "carequeue-auth-token"
      );

      if (!accessToken) {
        throw new Error(
          "Your login session has expired. Please log in again."
        );
      }

      await enablePushNotifications(accessToken);

      setPushStatus(
        "Notifications enabled on this device."
      );
    } catch (error) {
      setPushStatus(
        error.message || "Could not enable notifications."
      );
    } finally {
      setPushBusy(false);
    }
  };

  // Only hide the bell when the user is not a logged-in patient.
  if (!email) {
    return null;
  }

  return (
    <div className="cq-notification-root">
      {/* Notification bell */}
<button
  type="button"
  className="cq-notification-bell"
  onClick={() => setIsOpen((open) => !open)}
  aria-label={`Notifications, ${unreadCount} unread`}
  aria-expanded={isOpen}
>
  <span className="cq-bell-icon">
    <Bell size={20} strokeWidth={2} />
  </span>

  {unreadCount > 0 && (
    <span className="cq-notification-count">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )}
</button>

      {/* Notification panel */}
      {isOpen && (
        <div className="cq-notification-panel">
          <div className="cq-notification-header">
            <div>
              <h3>Notifications</h3>

              <p>
                {unreadCount > 0
                  ? `${unreadCount} unread notification(s)`
                  : "You're all caught up"}
              </p>
            </div>

            <button
              type="button"
              className="cq-close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
            >
              ×
            </button>
          </div>

          {/* Device notification settings */}
          <div className="cq-push-settings">
            <div>
              <strong>Device notifications</strong>

              <span>
                Get queue alerts even when CareQueue is in the background.
              </span>
            </div>

            <button
              type="button"
              disabled={pushBusy}
              onClick={handleEnablePush}
            >
              {pushBusy
                ? "Enabling…"
                : "Enable device notifications"}
            </button>

            {pushStatus && (
              <small role="status">
                {pushStatus}
              </small>
            )}
          </div>

          {/* Notification actions */}
          {notifications.length > 0 && (
            <div className="cq-notification-actions">
              <button
                type="button"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>

              <button
                type="button"
                onClick={clearNotifications}
              >
                Clear all
              </button>
            </div>
          )}

          {/* Notification list */}
          <div className="cq-notification-list">
            {notifications.length === 0 ? (
              <div className="cq-notification-empty">
                <span>🔔</span>

                <strong>No notifications yet</strong>

                <p>Queue updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  className={`cq-notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <span
                    className={`cq-notification-type ${notification.type}`}
                  >
                    {notification.type === "turn"
                      ? "🟢"
                      : notification.type === "next"
                        ? "🔔"
                        : notification.type === "paused"
                          ? "⏸️"
                          : notification.type === "resumed"
                            ? "▶️"
                            : "✅"}
                  </span>

                  <span className="cq-notification-text">
                    <strong>{notification.title}</strong>

                    <span>{notification.message}</span>

                    <small>
                      {formatTime(notification.createdAt)}
                    </small>
                  </span>

                  {!notification.read && (
                    <span className="cq-unread-dot"></span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
