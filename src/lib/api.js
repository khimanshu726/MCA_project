import { notifySessionEnded, requestFreshToken } from "../auth/authBridge";

const resolveDefaultApiBaseUrl = () => "/api";
const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

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

const serializeRequestBody = (body) => {
  if (!body) return undefined;
  if (body instanceof FormData) return body;
  return JSON.stringify(body);
};

const buildBackendHint = () =>
  API_BASE_URL.startsWith("http")
    ? ` Make sure the backend is running on ${API_BASE_URL.replace(/\/api$/, "")}.`
    : " Make sure the backend is running and reachable from this site.";

const sendRequest = async (path, { method, body, headers, token, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS }) => {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId =
    controller && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(headers, body, token),
      body: serializeRequestBody(body),
      signal: controller?.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`The server took too long to respond.${buildBackendHint()}`);
    }

    throw new Error(`Unable to reach the authentication server.${buildBackendHint()}`);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const readBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json") ? response.json() : null;
};

/**
 * A FormData body cannot be replayed: the browser consumes the underlying
 * stream when it sends it, so retrying with the same object uploads nothing.
 * Rather than silently sending an empty design file on retry, these are not
 * retried — the caller sees the 401 and the session-ended handler still fires.
 */
const isReplayable = (body) => !(body instanceof FormData);

export const request = async (path, { method = "GET", body, headers, token, timeoutMs } = {}) => {
  let response = await sendRequest(path, { method, body, headers, token, timeoutMs });

  if (response.status === 401 && token && isReplayable(body)) {
    const freshToken = await requestFreshToken();

    if (freshToken && freshToken !== token) {
      response = await sendRequest(path, { method, body, headers, token: freshToken, timeoutMs });
    }
  }

  const data = await readBody(response);

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && token) {
      notifySessionEnded(data?.code || "SESSION_INVALID");
    }

    const error = new Error(data?.message || "Request failed.");
    error.payload = data;
    error.status = response.status;
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

export const fetchCustomerProfile = (token, timeoutMs) =>
  request("/auth/customer/me", {
    token,
    timeoutMs,
  });

export const fetchCustomerOrders = (token) =>
  request("/orders/customer", {
    token,
  });

export const logoutCustomerSession = (token) =>
  request("/auth/customer/logout", {
    method: "POST",
    token,
    timeoutMs: 5000,
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

export const previewCheckoutPricing = ({ lineItems, couponCode }, token) =>
  request("/checkout/preview", {
    method: "POST",
    body: { lineItems, couponCode: couponCode || "" },
    token,
  });
