import { notifySessionEnded, requestFreshToken } from "../auth/authBridge";

const resolveDefaultApiBaseUrl = () => "/api";

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

const sendRequest = async (path, { method, body, headers, token }) => {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(headers, body, token),
      body: serializeRequestBody(body),
    });
  } catch {
    const backendHint = API_BASE_URL.startsWith("http")
      ? ` Make sure the backend is running on ${API_BASE_URL.replace(/\/api$/, "")}.`
      : " Make sure the backend is running and reachable from this site.";

    throw new Error(`Unable to reach the authentication server.${backendHint}`);
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

export const request = async (path, { method = "GET", body, headers, token } = {}) => {
  let response = await sendRequest(path, { method, body, headers, token });

  // An expired ID token is the normal case here, not an exception: Firebase
  // tokens live an hour, so any tab left open long enough will hit this. One
  // forced refresh and one replay turns that into something the customer never
  // sees. Only tokened requests are retried — a 401 without credentials means
  // "log in", not "your token went stale".
  if (response.status === 401 && token && isReplayable(body)) {
    const freshToken = await requestFreshToken();

    if (freshToken && freshToken !== token) {
      response = await sendRequest(path, { method, body, headers, token: freshToken });
    }
  }

  const data = await readBody(response);

  if (!response.ok) {
    // Still unauthorized after a refresh, or the refresh itself failed: the
    // session is genuinely over. Tell the provider so it can sign out cleanly
    // and route to login, rather than leaving the UI half-authenticated with a
    // failed request and no explanation.
    //
    // A 503 is excluded deliberately — that is the server unable to verify
    // ANYONE (Firebase Admin unconfigured), and signing the customer out over
    // it sends them into a login loop that cannot succeed.
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

export const fetchCustomerProfile = (token) =>
  request("/auth/customer/me", {
    token,
  });

export const fetchCustomerOrders = (token) =>
  request("/orders/customer", {
    token,
  });

// Revokes this account's refresh tokens server-side, so signing out here signs
// out every device rather than only clearing local state.
export const logoutCustomerSession = (token) =>
  request("/auth/customer/logout", {
    method: "POST",
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

// Stateless pricing/coupon preview for a proposed basket — used by the Buy Now
// checkout, which has no server cart for the cart coupon endpoint to mutate.
// The token is optional and carried only so coupon eligibility can consider the
// customer later; the preview itself is not an authenticated operation.
export const previewCheckoutPricing = ({ lineItems, couponCode }, token) =>
  request("/checkout/preview", {
    method: "POST",
    body: { lineItems, couponCode: couponCode || "" },
    token,
  });
