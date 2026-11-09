import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiFetch } from "../utils/api";

const QueueContext = createContext();

const QUEUE_STORAGE_KEY = "carequeue";
const PATIENT_TOKEN_STORAGE_KEY = "carequeue_patient_token";
const PATIENT_INITIAL_AHEAD_KEY = "carequeue_patient_initial_ahead";
const HISTORY_INDEX_KEY = "carequeue-history-index";
const PATIENT_TOKEN_OWNER_KEY = "carequeue_patient_token_owner";
const PATIENT_TOKEN_SESSION_KEY = "carequeue_patient_token_session";

const AUTH_TOKEN_KEY = "carequeue-auth-token";
const PATIENT_EMAIL_KEY = "carequeue-current-patient";

const SYNC_INTERVAL = 3000;

const defaultQueueData = {
  department: "General Medicine",
  doctor: "Dr. Rahul Sharma",
  estimatedTime: 5,
  nowServing: 1,
  waitingPatients: 0,
  nextTokenNumber: 2,
  waitingTokens: [],
  waitingMeta: {},
  queuePaused: false,
  queuePausedAt: null,
  totalPausedMs: 0,
  queueSessionId: "carequeue-initial-session",
};

const getHistoryKey = (email) =>
  `carequeue-history-${email}`;

function getAuthToken() {
  return sessionStorage.getItem(AUTH_TOKEN_KEY);
}

function getCurrentPatientEmail() {
  return sessionStorage.getItem(PATIENT_EMAIL_KEY);
}

function readPatientHistory(email) {
  if (!email) return [];

  try {
    return JSON.parse(
      localStorage.getItem(getHistoryKey(email)) || "[]"
    );
  } catch {
    return [];
  }
}

function writePatientHistory(email, history) {
  if (!email) return;

  localStorage.setItem(
    getHistoryKey(email),
    JSON.stringify(history)
  );
}

function readHistoryIndex() {
  try {
    return JSON.parse(
      localStorage.getItem(HISTORY_INDEX_KEY) || "{}"
    );
  } catch {
    return {};
  }
}

function writeHistoryIndex(index) {
  localStorage.setItem(
    HISTORY_INDEX_KEY,
    JSON.stringify(index)
  );
}

function updateHistoryStatus(
  token,
  status,
  queueSessionId = null
) {
  const index = readHistoryIndex();

  const reference =
    (queueSessionId &&
      index[`${queueSessionId}:${token}`]) ||
    index[String(token)];

  if (!reference) return;

  const { email, recordId } = reference;

  if (!email || !recordId) return;

  const history = readPatientHistory(email);

  const updatedHistory = history.map((record) => {
    if (
      record.id !== recordId ||
      !["Waiting", "In Progress"].includes(record.status)
    ) {
      return record;
    }

    return {
      ...record,
      status,
      ...(status === "Left Queue"
        ? { endedAt: new Date().toISOString() }
        : {}),
    };
  });

  writePatientHistory(email, updatedHistory);
}

function normalizeQueueData(data) {
  const merged = {
    ...defaultQueueData,
    ...data,
  };

  const nowServing = Math.max(
    0,
    Math.floor(Number(merged.nowServing) || 0)
  );

  const estimatedTime = Math.max(
    0,
    Number(merged.estimatedTime) || 0
  );

  let waitingTokens = Array.isArray(merged.waitingTokens)
    ? merged.waitingTokens
        .map(Number)
        .filter(
          (token) =>
            Number.isFinite(token) && token > nowServing
        )
    : [];

  waitingTokens = [...new Set(waitingTokens)].sort(
    (a, b) => a - b
  );

  const waitingMeta =
    merged.waitingMeta &&
    typeof merged.waitingMeta === "object"
      ? { ...merged.waitingMeta }
      : {};

  waitingTokens.forEach((token, index) => {
    const existingMeta = waitingMeta[String(token)];

    if (
      !existingMeta ||
      !Number.isFinite(Number(existingMeta.joinedAt)) ||
      Number(existingMeta.joinedAt) <= 0
    ) {
      const initialAhead = index + 1;

      waitingMeta[String(token)] = {
        joinedAt: Date.now(),
        initialAhead,
        estimatedWaitMinutes: initialAhead * estimatedTime,
        pausedMsAtJoin: Number(merged.totalPausedMs) || 0,
      };
    } else {
      waitingMeta[String(token)] = {
        ...existingMeta,
        initialAhead: Math.max(
          1,
          Number(existingMeta.initialAhead) || index + 1
        ),
        estimatedWaitMinutes: Math.max(
          0,
          Number(existingMeta.estimatedWaitMinutes) ||
            (index + 1) * estimatedTime
        ),
        pausedMsAtJoin: Math.max(
          0,
          Number(existingMeta.pausedMsAtJoin) || 0
        ),
      };
    }
  });

  Object.keys(waitingMeta).forEach((token) => {
    if (!waitingTokens.includes(Number(token))) {
      delete waitingMeta[token];
    }
  });

  const highestToken =
    waitingTokens.length > 0
      ? waitingTokens[waitingTokens.length - 1]
      : nowServing;

  const nextTokenNumber = Math.max(
    Math.floor(Number(merged.nextTokenNumber) || 0),
    highestToken + 1,
    nowServing + 1
  );

  return {
    ...merged,
    nowServing,
    estimatedTime,
    waitingTokens,
    waitingPatients: waitingTokens.length,
    waitingMeta,
    nextTokenNumber,
    queuePaused: Boolean(merged.queuePaused),
    queuePausedAt:
      merged.queuePausedAt === null ||
      merged.queuePausedAt === undefined ||
      Number(merged.queuePausedAt) === 0
        ? null
        : Number(merged.queuePausedAt),
    totalPausedMs: Math.max(
      0,
      Number(merged.totalPausedMs) || 0
    ),
    queueSessionId:
      merged.queueSessionId ||
      defaultQueueData.queueSessionId,
  };
}

function getSavedQueueData() {
  try {
    const saved = localStorage.getItem(QUEUE_STORAGE_KEY);

    return saved
      ? normalizeQueueData(JSON.parse(saved))
      : normalizeQueueData(defaultQueueData);
  } catch {
    return normalizeQueueData(defaultQueueData);
  }
}

function getSavedPatientToken() {
  const saved = sessionStorage.getItem(
    PATIENT_TOKEN_STORAGE_KEY
  );

  const owner = sessionStorage.getItem(
    PATIENT_TOKEN_OWNER_KEY
  );

  const currentPatient = getCurrentPatientEmail();

  if (
    owner &&
    currentPatient &&
    owner.toLowerCase() !== currentPatient.toLowerCase()
  ) {
    return null;
  }

  if (saved === null) return null;

  const token = Number(saved);

  return Number.isFinite(token) ? token : null;
}

function getSavedInitialAhead() {
  const saved = sessionStorage.getItem(
    PATIENT_INITIAL_AHEAD_KEY
  );

  if (saved === null) return null;

  const value = Number(saved);

  return Number.isFinite(value)
    ? Math.max(0, value)
    : null;
}

async function readBackendQueue() {
  const response = await apiFetch("/api/queue/state");

  if (!response.ok) {
    throw new Error(
      `Queue loading failed (${response.status}).`
    );
  }

  const data = await response.json();

  return normalizeQueueData(data);
}

function QueueProvider({ children }) {
  const [queueData, setQueueData] = useState(
    getSavedQueueData
  );

  const [patientToken, setPatientToken] = useState(
    getSavedPatientToken
  );

  const [patientInitialAhead, setPatientInitialAhead] =
    useState(getSavedInitialAhead);

  const [backendReady, setBackendReady] = useState(false);

  const queueDataRef = useRef(queueData);
  const previousNowServing = useRef(queueData.nowServing);

  const backendReadyRef = useRef(false);
  const pendingWritesRef = useRef(0);
  const writeChainRef = useRef(Promise.resolve());
  const queueVersionRef = useRef(0);
  const joiningRef = useRef(false);
  const leavingRef = useRef(false);

  /*
   * Keep localStorage updated and update React state.
   */
  const applyQueueData = (data) => {
    const normalized = normalizeQueueData(data);

    queueDataRef.current = normalized;

    localStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify(normalized)
    );

    setQueueData(normalized);

    return normalized;
  };

  /*
   * Send admin queue changes to the Spring Boot backend.
   * Admin authorization is required for this endpoint.
   */
  const persistQueueData = (data) => {
    const snapshot = normalizeQueueData(data);
    const version = ++queueVersionRef.current;

    if (!backendReadyRef.current) {
      return Promise.resolve(snapshot);
    }

    pendingWritesRef.current += 1;

    const writeOperation = writeChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const payload = {
          department: snapshot.department,
          doctor: snapshot.doctor,
          estimatedTime: snapshot.estimatedTime,
          nowServing: snapshot.nowServing,
          waitingPatients: snapshot.waitingTokens.length,
          nextTokenNumber: snapshot.nextTokenNumber,
          waitingTokens: snapshot.waitingTokens,
          waitingMeta: snapshot.waitingMeta,
          queuePaused: snapshot.queuePaused,
          queuePausedAt: snapshot.queuePausedAt || 0,
          totalPausedMs: snapshot.totalPausedMs,
          queueSessionId: snapshot.queueSessionId,
        };

        const response = await apiFetch(
          "/api/queue/state",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        const responseData = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            responseData?.message ||
              `Queue save failed (${response.status}).`
          );
        }

        const serverState = normalizeQueueData(responseData);

        if (version === queueVersionRef.current) {
          applyQueueData(serverState);
        }

        return serverState;
      })
      .catch((error) => {
        console.error(
          "Queue backend synchronization error:",
          error
        );

        return null;
      })
      .finally(() => {
        pendingWritesRef.current = Math.max(
          0,
          pendingWritesRef.current - 1
        );
      });

    writeChainRef.current = writeOperation;

    return writeOperation;
  };

  /*
   * Initial backend load.
   * PostgreSQL is the shared source of queue information.
   */
  useEffect(() => {
    let cancelled = false;

    const loadQueue = async () => {
      try {
        const latest = await readBackendQueue();

        if (cancelled) return;

        applyQueueData(latest);

        previousNowServing.current = latest.nowServing;

        backendReadyRef.current = true;
        setBackendReady(true);

        console.log(
          "CareQueue: shared queue loaded from backend."
        );
      } catch (error) {
        console.error(
          "Unable to load queue from backend:",
          error
        );
      }
    };

    loadQueue();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Poll PostgreSQL for changes made on other devices.
   */
  useEffect(() => {
    const syncFromBackend = async () => {
      if (
        !backendReadyRef.current ||
        pendingWritesRef.current > 0
      ) {
        return;
      }

      try {
        const latest = await readBackendQueue();

        if (pendingWritesRef.current > 0) return;

        const current = queueDataRef.current;

        const currentJSON = JSON.stringify(
          normalizeQueueData(current)
        );

        const latestJSON = JSON.stringify(latest);

        if (currentJSON !== latestJSON) {
          queueDataRef.current = latest;

          localStorage.setItem(
            QUEUE_STORAGE_KEY,
            JSON.stringify(latest)
          );

          setQueueData(latest);
        }
      } catch (error) {
        console.error(
          "Queue refresh error:",
          error
        );
      }
    };

    const interval = window.setInterval(
      syncFromBackend,
      SYNC_INTERVAL
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Central queue update function.
   * Used for admin changes, not patient join/leave.
   */
  const saveQueueData = (updater) => {
    const previous = queueDataRef.current;

    const updated =
      typeof updater === "function"
        ? updater(previous)
        : updater;

    if (!updated || updated === previous) {
      return previous;
    }

    const normalized = applyQueueData(updated);

    persistQueueData(normalized);

    return normalized;
  };

  /*
   * Keep the queue ref current.
   */
  useEffect(() => {
    queueDataRef.current = queueData;
  }, [queueData]);

  /*
   * Keep the patient token in the current browser tab.
   */
  useEffect(() => {
    if (patientToken === null) {
      sessionStorage.removeItem(
        PATIENT_TOKEN_STORAGE_KEY
      );
    } else {
      sessionStorage.setItem(
        PATIENT_TOKEN_STORAGE_KEY,
        String(patientToken)
      );
    }
  }, [patientToken]);

  useEffect(() => {
    if (patientInitialAhead === null) {
      sessionStorage.removeItem(
        PATIENT_INITIAL_AHEAD_KEY
      );
    } else {
      sessionStorage.setItem(
        PATIENT_INITIAL_AHEAD_KEY,
        String(patientInitialAhead)
      );
    }
  }, [patientInitialAhead]);

  /*
   * Keep the patient's saved token associated with the
   * queue session in which it was generated.
   */
  useEffect(() => {
    const savedSession = sessionStorage.getItem(
      PATIENT_TOKEN_SESSION_KEY
    );

    const savedToken = sessionStorage.getItem(
      PATIENT_TOKEN_STORAGE_KEY
    );

    if (
      savedToken !== null &&
      savedSession &&
      savedSession !== queueData.queueSessionId
    ) {
      sessionStorage.removeItem(
        PATIENT_TOKEN_STORAGE_KEY
      );

      sessionStorage.removeItem(
        PATIENT_TOKEN_OWNER_KEY
      );

      sessionStorage.removeItem(
        PATIENT_TOKEN_SESSION_KEY
      );

      sessionStorage.removeItem(
        PATIENT_INITIAL_AHEAD_KEY
      );

      setPatientToken(null);
      setPatientInitialAhead(null);
    }
  }, [queueData.queueSessionId]);

  /*
   * Synchronize queue changes between tabs in the same browser.
   */
  useEffect(() => {
    const handleStorage = (event) => {
      if (
        event.key !== QUEUE_STORAGE_KEY ||
        !event.newValue
      ) {
        return;
      }

      try {
        const latest = normalizeQueueData(
          JSON.parse(event.newValue)
        );

        queueDataRef.current = latest;
        setQueueData(latest);
      } catch (error) {
        console.error(
          "Local queue synchronization error:",
          error
        );
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  /*
   * Update patient history when the serving token changes.
   */
  useEffect(() => {
    const previous = Number(previousNowServing.current);
    const current = Number(queueData.nowServing);

    if (current === previous) return;

    if (current > previous) {
      updateHistoryStatus(
        previous,
        "Left Queue",
        queueData.queueSessionId
      );

      for (
        let token = previous + 1;
        token < current;
        token++
      ) {
        updateHistoryStatus(
          token,
          "Left Queue",
          queueData.queueSessionId
        );
      }

      updateHistoryStatus(
        current,
        "In Progress",
        queueData.queueSessionId
      );
    } else {
      updateHistoryStatus(
        previous,
        "Left Queue",
        queueData.queueSessionId
      );
    }

    previousNowServing.current = current;
  }, [
    queueData.nowServing,
    queueData.queueSessionId,
  ]);

  /*
   * Admin queue settings and manual waiting count.
   */
  const updateQueue = (updates) => {
    let removedByCount = [];

    const result = saveQueueData((previous) => {
      let next = {
        ...previous,
        ...updates,
      };

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "nowServing"
        )
      ) {
        const newServing = Math.max(
          0,
          Math.floor(Number(updates.nowServing) || 0)
        );

        const remainingTokens =
          previous.waitingTokens.filter(
            (token) => token > newServing
          );

        const remainingMeta = {
          ...previous.waitingMeta,
        };

        Object.keys(remainingMeta).forEach((token) => {
          if (Number(token) <= newServing) {
            delete remainingMeta[token];
          }
        });

        next = {
          ...next,
          nowServing: newServing,
          waitingTokens: remainingTokens,
          waitingMeta: remainingMeta,
          nextTokenNumber: Math.max(
            previous.nextTokenNumber,
            newServing + 1
          ),
        };
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updates,
          "waitingPatients"
        )
      ) {
        const target = Math.max(
          0,
          Math.floor(Number(updates.waitingPatients) || 0)
        );

        let tokens = [...next.waitingTokens].sort(
          (a, b) => a - b
        );

        const meta = { ...next.waitingMeta };

        if (target > tokens.length) {
          let nextToken = next.nextTokenNumber;

          while (tokens.length < target) {
            const token = nextToken++;
            const joinedAt = Date.now();
            const initialAhead = tokens.length + 1;

            tokens.push(token);

            meta[String(token)] = {
              joinedAt,
              initialAhead,
              estimatedWaitMinutes:
                initialAhead * next.estimatedTime,
              pausedMsAtJoin: next.totalPausedMs,
            };
          }

          next.nextTokenNumber = nextToken;
        } else if (target < tokens.length) {
          const removedTokens = tokens.slice(target);

          removedByCount = removedTokens;

          removedTokens.forEach((token) => {
            delete meta[String(token)];
          });

          tokens = tokens.slice(0, target);
        }

        next.waitingTokens = tokens;
        next.waitingMeta = meta;
      }

      return next;
    });

    removedByCount.forEach((token) =>
      updateHistoryStatus(
        token,
        "Left Queue",
        result.queueSessionId
      )
    );

    return result;
  };

  /*
   * Patient joins the queue.
   *
   * The backend generates the token. The frontend does not
   * generate or save a token until the backend confirms it.
   */
  const generateToken = async () => {
    if (joiningRef.current) return null;

    const email = getCurrentPatientEmail();
    const authToken = getAuthToken();

    if (!email || !authToken) {
      console.error(
        "Patient login is required before joining the queue."
      );

      return null;
    }

    if (!backendReadyRef.current) {
      console.error(
        "Queue is still loading. Please try again."
      );

      return null;
    }

    const currentSessionId =
      queueDataRef.current.queueSessionId;

    const existingSessionToken = getSavedPatientToken();
    const savedTokenSession = sessionStorage.getItem(
      PATIENT_TOKEN_SESSION_KEY
    );

    const savedOwner = sessionStorage.getItem(
      PATIENT_TOKEN_OWNER_KEY
    );

    if (
      existingSessionToken !== null &&
      savedTokenSession === currentSessionId &&
      savedOwner?.toLowerCase() === email.toLowerCase()
    ) {
      setPatientToken(existingSessionToken);
      return existingSessionToken;
    }

    joiningRef.current = true;

    try {
      const response = await apiFetch(
        "/api/queue/join",
        {
          method: "POST",
        }
      );

      const responseData = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            `Unable to join queue (${response.status}).`
        );
      }

      const token = Number(responseData?.token);

      if (!Number.isFinite(token) || token <= 0) {
        throw new Error(
          "The backend did not return a valid patient token."
        );
      }

      const sessionId =
        responseData.queueSessionId ||
        queueDataRef.current.queueSessionId;

      const latest = await readBackendQueue();

      /*
       * Save the confirmed token and its owner/session.
       */
      sessionStorage.setItem(
        PATIENT_TOKEN_STORAGE_KEY,
        String(token)
      );

      sessionStorage.setItem(
        PATIENT_TOKEN_OWNER_KEY,
        email.toLowerCase()
      );

      sessionStorage.setItem(
        PATIENT_TOKEN_SESSION_KEY,
        sessionId
      );

      const initialAhead = Math.max(
        0,
        Number(responseData.initialAhead) ||
          latest.waitingTokens.filter(
            (waitingToken) => waitingToken <= token
          ).length
      );

      sessionStorage.setItem(
        PATIENT_INITIAL_AHEAD_KEY,
        String(initialAhead)
      );

      setPatientToken(token);
      setPatientInitialAhead(initialAhead);

      /*
       * Update the shared queue display from PostgreSQL.
       */
      applyQueueData(latest);

      /*
       * Save patient history only after backend registration
       * succeeds.
       */
      const history = readPatientHistory(email);

      const existingRecord = history.find(
        (record) =>
          Number(record.token) === token &&
          record.status === "Waiting"
      );

      if (!existingRecord) {
        const record = {
          id: `${Date.now()}-${token}`,
          token,
          department: latest.department,
          doctor: latest.doctor,
          createdAt: new Date().toISOString(),
          completedAt: null,
          endedAt: null,
          status: "Waiting",
          initialAhead,
        };

        history.unshift(record);
        writePatientHistory(email, history);

        const index = readHistoryIndex();

        index[`${sessionId}:${token}`] = {
          email,
          recordId: record.id,
          queueSessionId: sessionId,
          token,
        };

        index[String(token)] = {
          email,
          recordId: record.id,
          queueSessionId: sessionId,
          token,
        };

        writeHistoryIndex(index);
      }

      console.log(
        `CareQueue: backend assigned patient token A-${String(token).padStart(3, "0")}.`
      );

      return token;

    } catch (error) {
      console.error(
        "Patient queue registration error:",
        error
      );

      return null;

    } finally {
      joiningRef.current = false;
    }
  };

  /*
   * Patient leaves the waiting queue.
   * The backend removes the ticket using the authenticated
   * patient's identity, token and queue session.
   */
  const clearPatientToken = async () => {
    if (leavingRef.current) return false;

    const tokenToRemove = getSavedPatientToken();

    if (tokenToRemove === null) return false;

    const email = getCurrentPatientEmail();
    const sessionId =
      sessionStorage.getItem(PATIENT_TOKEN_SESSION_KEY) ||
      queueDataRef.current.queueSessionId;

    if (!getAuthToken()) {
      console.error(
        "Patient authentication is required to leave the queue."
      );

      return false;
    }

    leavingRef.current = true;

    try {
      const response = await apiFetch(
        "/api/queue/leave",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: tokenToRemove,
            queueSessionId: sessionId,
          }),
        }
      );

      const responseData = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          responseData?.message ||
            `Unable to leave queue (${response.status}).`
        );
      }

      /*
       * Read the latest shared state after the backend
       * confirms the patient has left.
       */
      const latest = await readBackendQueue();

      applyQueueData(latest);

      updateHistoryStatus(
        tokenToRemove,
        "Left Queue",
        sessionId
      );

      sessionStorage.removeItem(
        PATIENT_TOKEN_STORAGE_KEY
      );

      sessionStorage.removeItem(
        PATIENT_TOKEN_OWNER_KEY
      );

      sessionStorage.removeItem(
        PATIENT_TOKEN_SESSION_KEY
      );

      sessionStorage.removeItem(
        PATIENT_INITIAL_AHEAD_KEY
      );

      setPatientToken(null);
      setPatientInitialAhead(null);

      console.log(
        "CareQueue: patient successfully left the queue."
      );

      return true;

    } catch (error) {
      console.error(
        "Patient queue leave error:",
        error
      );

      return false;

    } finally {
      leavingRef.current = false;
    }
  };

  /*
   * Admin calls the next waiting patient.
   */
  const callNextPatient = () => {
    if (queueDataRef.current.queuePaused) return;

    saveQueueData((previous) => {
      if (previous.waitingTokens.length === 0) {
        return previous;
      }

      const sorted = [
        ...previous.waitingTokens,
      ].sort((a, b) => a - b);

      const nextToken = sorted[0];
      const remaining = sorted.slice(1);

      const meta = {
        ...previous.waitingMeta,
      };

      delete meta[String(nextToken)];

      return {
        ...previous,
        nowServing: nextToken,
        waitingTokens: remaining,
        waitingMeta: meta,
      };
    });
  };

  /*
   * Admin manually adds one waiting patient.
   */
  const addPatient = () => {
    saveQueueData((previous) => {
      const token = Math.max(
        previous.nextTokenNumber,
        previous.nowServing + 1,
        (previous.waitingTokens.at(-1) || 0) + 1
      );

      const joinedAt = Date.now();
      const initialAhead =
        previous.waitingTokens.length + 1;

      return {
        ...previous,
        waitingTokens: [
          ...previous.waitingTokens,
          token,
        ].sort((a, b) => a - b),
        waitingMeta: {
          ...previous.waitingMeta,
          [String(token)]: {
            joinedAt,
            initialAhead,
            estimatedWaitMinutes:
              initialAhead * previous.estimatedTime,
            pausedMsAtJoin: previous.totalPausedMs,
          },
        },
        nextTokenNumber: token + 1,
      };
    });
  };

  /*
   * Admin removes the last waiting patient.
   */
  const removePatient = () => {
    let removedToken = null;

    const sessionId =
      queueDataRef.current.queueSessionId;

    saveQueueData((previous) => {
      if (previous.waitingTokens.length === 0) {
        return previous;
      }

      const tokens = [
        ...previous.waitingTokens,
      ].sort((a, b) => a - b);

      removedToken = tokens.pop();

      const meta = {
        ...previous.waitingMeta,
      };

      delete meta[String(removedToken)];

      return {
        ...previous,
        waitingTokens: tokens,
        waitingMeta: meta,
      };
    });

    if (removedToken !== null) {
      updateHistoryStatus(
        removedToken,
        "Left Queue",
        sessionId
      );
    }
  };

  /*
   * Reset queue and create a new queue session.
   */
  const resetQueue = (startingToken = 1) => {
    const start = Math.max(
      0,
      Math.floor(Number(startingToken) || 0)
    );

    const previous = queueDataRef.current;

    updateHistoryStatus(
      previous.nowServing,
      "Left Queue",
      previous.queueSessionId
    );

    previous.waitingTokens.forEach((token) => {
      updateHistoryStatus(
        token,
        "Left Queue",
        previous.queueSessionId
      );
    });

    saveQueueData((oldQueue) => ({
      ...oldQueue,
      nowServing: start,
      waitingTokens: [],
      waitingMeta: {},
      nextTokenNumber: start + 1,
      queuePaused: false,
      queuePausedAt: null,
      totalPausedMs: 0,
      queueSessionId: `queue-${Date.now()}`,
    }));

    sessionStorage.removeItem(
      PATIENT_TOKEN_STORAGE_KEY
    );

    sessionStorage.removeItem(
      PATIENT_TOKEN_OWNER_KEY
    );

    sessionStorage.removeItem(
      PATIENT_TOKEN_SESSION_KEY
    );

    sessionStorage.removeItem(
      PATIENT_INITIAL_AHEAD_KEY
    );

    setPatientToken(null);
    setPatientInitialAhead(null);
  };

  /*
   * Pause or resume the queue.
   */
  const toggleQueue = () => {
    saveQueueData((previous) => {
      if (previous.queuePaused) {
        const pausedDuration = previous.queuePausedAt
          ? Date.now() - previous.queuePausedAt
          : 0;

        return {
          ...previous,
          queuePaused: false,
          queuePausedAt: null,
          totalPausedMs:
            previous.totalPausedMs + pausedDuration,
        };
      }

      return {
        ...previous,
        queuePaused: true,
        queuePausedAt: Date.now(),
      };
    });
  };

  return (
    <QueueContext.Provider
      value={{
        queueData,
        patientToken,
        patientInitialAhead,
        setPatientInitialAhead,
        updateQueue,
        generateToken,
        clearPatientToken,
        callNextPatient,
        addPatient,
        removePatient,
        resetQueue,
        toggleQueue,
        backendReady,
      }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  return useContext(QueueContext);
}

export default QueueProvider;