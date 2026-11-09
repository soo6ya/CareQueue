
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://10.236.227.205:8080"
).replace(/\/+$/, "");

const api = (path) => `${API_BASE}${path}`;

function decodeBase64Url(value) {
  const normalized = value
    .trim()
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding = "=".repeat(
    (4 - (normalized.length % 4)) % 4
  );

  const raw = window.atob(normalized + padding);

  return Uint8Array.from(
    raw,
    (character) => character.charCodeAt(0)
  );
}

function authHeaders(accessToken) {
  if (!accessToken) {
    throw new Error("Please sign in again to manage notifications.");
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
  };
}

async function fetchPublicKey() {
  const response = await fetch(api("/api/push/public-key"));

  if (!response.ok) {
    throw new Error(
      `Cannot reach notification server. HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.publicKey) {
    throw new Error("Push server public key is not configured.");
  }

  return data.publicKey;
}

export async function enablePushNotifications(accessToken) {
  if (!accessToken) {
    throw new Error("Please sign in before enabling notifications.");
  }

  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    throw new Error(
      "This browser does not support background push notifications."
    );
  }

  if (!window.isSecureContext) {
    throw new Error(
      "Push notifications require HTTPS. Localhost is allowed for development."
    );
  }

  if (!("Notification" in window)) {
    throw new Error("Browser notifications are not supported.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted. Allow it in browser settings."
    );
  }

  const registration =
    await navigator.serviceWorker.register("/service-worker.js");

  await navigator.serviceWorker.ready;

  const publicKey = await fetchPublicKey();

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey),
    });
  }

  const response = await fetch(
    api("/api/push/subscribe"),
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(subscription.toJSON()),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Could not save device subscription. HTTP ${response.status}`
    );
  }

  return true;
}

export async function disablePushNotifications(accessToken) {
  if (!accessToken) {
    throw new Error("Please sign in again to manage notifications.");
  }

  const registration =
    await navigator.serviceWorker.getRegistration("/");

  const subscription =
    await registration?.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const response = await fetch(
    api("/api/push/unsubscribe"),
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Could not remove device subscription. HTTP ${response.status}`
    );
  }

  await subscription.unsubscribe();

  return true;
}
