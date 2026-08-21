const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const config = {
    credentials: "include",
    ...options,
    headers,
  };

  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      // Silent automatic access token refresh on 401 Unauthorized
      const isAuthEndpoint = endpoint.includes("/auth/login") || 
                             endpoint.includes("/auth/register") || 
                             endpoint.includes("/auth/refresh-token");

      if (response.status === 401 && !options._retry && !isAuthEndpoint) {
        options._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => request(endpoint, options))
            .catch((err) => Promise.reject(err));
        }

        isRefreshing = true;

        try {
          await request("/auth/refresh-token", { method: "POST", _retry: true });
          isRefreshing = false;
          processQueue(null);
          return await request(endpoint, options);
        } catch (refreshErr) {
          isRefreshing = false;
          processQueue(refreshErr, null);
          const errorMsg = "Session expired. Please log in again.";
          throw new Error(errorMsg);
        }
      }

      const errorMsg = data.message || "An unexpected API error occurred.";
      throw new Error(errorMsg);
    }

    return data.data !== undefined ? data.data : data;
  } catch (error) {
    if (error.name === "TypeError" && (error.message === "Failed to fetch" || error.message.includes("fetch"))) {
      throw new Error("Unable to connect to the backend server. Please verify your backend server is running.");
    }
    throw error;
  }
}

export const api = {
  get: (endpoint, headers) => request(endpoint, { method: "GET", headers }),
  post: (endpoint, body, headers) => request(endpoint, { method: "POST", body, headers }),
  put: (endpoint, body, headers) => request(endpoint, { method: "PUT", body, headers }),
  patch: (endpoint, body, headers) => request(endpoint, { method: "PATCH", body, headers }),
  delete: (endpoint, headers) => request(endpoint, { method: "DELETE", headers }),
  uploadCsv: (endpoint, formData) => request(endpoint, { method: "POST", body: formData }),
};

