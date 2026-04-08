const DEFAULT_API_BASE_URL = import.meta.env.PROD ? "/api" : "http://localhost:4000/api";

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL;
export const API_ASSET_BASE_URL = API_BASE_URL.replace(/\/api$/, "");
export const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;

const buildHeaders = (headers, body, token) => {
  const nextHeaders = { ...headers };

  if (!(body instanceof FormData)) {
    nextHeaders["Content-Type"] = nextHeaders["Content-Type"] || "application/json";
  }

  if (token) {
    nextHeaders.Authorization = `Bearer ${token}`;
  }

  return nextHeaders;
};

const request = async (path, { method = "GET", body, headers, token } = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(headers, body, token),
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const backendHint = API_BASE_URL.startsWith("http")
      ? ` Make sure the backend is running on ${API_BASE_URL.replace(/\/api$/, "")}.`
      : " Make sure the backend is running and reachable from this site.";

    throw new Error(`Unable to reach the authentication server.${backendHint}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.message || "Request failed.");
    error.payload = data;
    throw error;
  }

  return data;
};

export const createOrder = (formData) =>
  request("/orders", {
    method: "POST",
    body: formData,
  });

export const registerAdmin = (payload) =>
  request("/auth/register", {
    method: "POST",
    body: payload,
  });

export const loginAdmin = (credentials) =>
  request("/auth/login", {
    method: "POST",
    body: credentials,
  });

export const sendLoginOtp = (payload) =>
  request("/auth/send-otp", {
    method: "POST",
    body: payload,
  });

export const verifyLoginOtp = (payload) =>
  request("/auth/verify-otp", {
    method: "POST",
    body: payload,
  });

export const fetchAdminProfile = (token) =>
  request("/auth/me", {
    token,
  });

export const fetchOrders = (token, filters = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      searchParams.set(key, value);
    }
  });

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return request(`/orders${suffix}`, {
    token,
  });
};

export const fetchOrder = (id, token) =>
  request(`/orders/${id}`, {
    token,
  });

export const updateOrder = (id, payload, token) =>
  request(`/orders/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });

export const deleteOrder = (id, token) =>
  request(`/orders/${id}`, {
    method: "DELETE",
    token,
  });
