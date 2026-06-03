const DEFAULT_API_BASE_URL = import.meta.env.PROD ? "/api" : "http://localhost:4000/api";

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL;
export const API_ASSET_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

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

export const createOrder = (formData, token) =>
  request("/orders", {
    method: "POST",
    body: formData,
    token,
  });

export const registerCustomer = (payload) =>
  request("/auth/customer/register", {
    method: "POST",
    body: payload,
  });

export const loginCustomer = (credentials) =>
  request("/auth/customer/login", {
    method: "POST",
    body: credentials,
  });

export const fetchCustomerProfile = (token) =>
  request("/auth/customer/me", {
    token,
  });

export const fetchCustomerOrders = (token) =>
  request("/orders/customer", {
    token,
  });

export const createRazorpayOrder = (formData, token) =>
  request("/create-order", {
    method: "POST",
    body: formData,
    token,
  });

export const verifyRazorpayPayment = (payload) =>
  request("/verify-payment", {
    method: "POST",
    body: payload,
  });
