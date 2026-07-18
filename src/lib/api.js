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

export const request = async (path, { method = "GET", body, headers, token } = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
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
