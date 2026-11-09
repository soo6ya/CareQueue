
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

const TOKEN_KEY = "carequeue-auth-token";
const ADMIN_KEY = "carequeue-current-admin";
const PATIENT_KEY = "carequeue-current-patient";

// Prevent multiple simultaneous refresh requests.
let refreshPromise = null;

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_KEY);
  sessionStorage.removeItem(PATIENT_KEY);
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/refresh`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (!response.ok) {
          clearSession();
          return null;
        }

        const data = await response.json();

        if (!data.token) {
          clearSession();
          return null;
        }

        sessionStorage.setItem(TOKEN_KEY, data.token);
        return data.token;
      } catch (error) {
        console.error("Token refresh failed:", error);
        clearSession();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiFetch(path, options = {}) {
  const excludedPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
  ];

  const shouldSkipRefresh = excludedPaths.some(
    (excludedPath) => path === excludedPath
  );

  const makeRequest = (token) => {
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
  };

  const currentToken = sessionStorage.getItem(TOKEN_KEY);

  let response = await makeRequest(currentToken);

  // Only attempt refresh once for an expired/invalid access token.
  if (response.status !== 401 || shouldSkipRefresh) {
    return response;
  }

  // No access token means this may be an unauthenticated request.
  if (!currentToken) {
    return response;
  }

  const newToken = await refreshAccessToken();

  if (!newToken) {
    return response;
  }

  // Retry the original request once with the refreshed token.
  response = await makeRequest(newToken);

  return response;
}
