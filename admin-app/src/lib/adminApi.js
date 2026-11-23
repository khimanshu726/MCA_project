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

// Fired when the server refuses the admin's token (it lasts 8 hours). The
// auth context listens and signs out, so the admin lands on the login page
// instead of seeing empty lists that look like missing data.
export const SESSION_EXPIRED_EVENT = "elite-admin-session-expired";

// While Render restarts the server (every deploy) requests briefly fail with
// a gateway error or no answer at all. Reads are safe to repeat, so they get
// a couple of quiet retries before an error is shown.
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
export const READ_RETRY_DELAYS_MS = [1500, 4000];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path, { method = "GET", body, headers, token } = {}) => {
  let response;
  const retryDelays = method === "GET" ? READ_RETRY_DELAYS_MS : [];

  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: buildHeaders(headers, body, token),
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch {
      if (attempt < retryDelays.length) {
        await wait(retryDelays[attempt]);
        continue;
      }
      const backendHint = API_BASE_URL.startsWith("http")
        ? ` Make sure the backend is running on ${API_BASE_URL.replace(/\/api$/, "")}.`
        : " The server may be restarting after an update. Try again in a minute.";

      throw new Error(`Unable to reach the admin server.${backendHint}`);
    }
    if (RETRYABLE_STATUSES.has(response.status) && attempt < retryDelays.length) {
      await wait(retryDelays[attempt]);
      continue;
    }
    break;
  }

  if (response.status === 401 && token && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        (RETRYABLE_STATUSES.has(response.status)
          ? "The server is restarting after an update. Try again in a minute."
          : "Request failed."),
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

export const loginAdmin = (credentials) =>
  request("/auth/admin/login", {
    method: "POST",
    body: credentials,
  });

export const sendAdminEmailOtp = (payload) =>
  request("/auth/admin/email-otp/send", {
    method: "POST",
    body: payload,
  });

export const verifyAdminEmailOtp = (payload) =>
  request("/auth/admin/email-otp/verify", {
    method: "POST",
    body: payload,
  });

export const fetchAdminProfile = (token) =>
  request("/auth/admin/me", {
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

  return request(`/admin/orders${suffix}`, {
    token,
  });
};

export const fetchOrder = (id, token) =>
  request(`/admin/orders/${id}`, {
    token,
  });

export const updateOrder = (id, payload, token) =>
  request(`/admin/orders/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });

export const deleteOrder = (id, token) =>
  request(`/admin/orders/${id}`, {
    method: "DELETE",
    token,
  });

export const fetchUsers = (token) =>
  request("/admin/users", {
    token,
  });

export const fetchAdminProducts = (token, filters = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      searchParams.set(key, value);
    }
  });

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";

  return request(`/admin/products${suffix}`, {
    token,
  });
};

export const createProduct = (payload, token) =>
  request("/admin/products", {
    method: "POST",
    body: payload,
    token,
  });

export const updateProduct = (id, payload, token) =>
  request(`/admin/products/${id}`, {
    method: "PUT",
    body: payload,
    token,
  });

export const deleteProduct = (id, token) =>
  request(`/admin/products/${id}`, {
    method: "DELETE",
    token,
  });

/**
 * Uploads product photos and returns their stored URLs. FormData, so `request`
 * leaves the Content-Type alone and lets the browser set the multipart boundary.
 */
export const uploadProductImages = (files, token) => {
  const body = new FormData();
  Array.from(files).forEach((file) => body.append("images", file));

  return request("/admin/products/images", {
    method: "POST",
    body,
    token,
  });
};

export const fetchHealth = () => request("/health");

// HSN/SAC codes and their GST rates.
export const fetchHsnCodes = (token) => request("/admin/hsn-codes", { token });

export const createHsnCode = (payload, token) => request("/admin/hsn-codes", { method: "POST", body: payload, token });

export const updateHsnCode = (id, payload, token) =>
  request(`/admin/hsn-codes/${id}`, { method: "PUT", body: payload, token });

export const deleteHsnCode = (id, token) => request(`/admin/hsn-codes/${id}`, { method: "DELETE", token });

// Collections that group products (e.g. every wedding card design).
export const fetchAdminCollections = (token) => request("/admin/collections", { token });

export const createCollection = (payload, token) =>
  request("/admin/collections", { method: "POST", body: payload, token });

export const updateCollection = (id, payload, token) =>
  request(`/admin/collections/${id}`, { method: "PUT", body: payload, token });

// Bulk changes to a collection's designs: { add, remove, publish: [product ids], category }.
export const updateCollectionDesigns = (id, changes, token) =>
  request(`/admin/collections/${id}/designs`, { method: "POST", body: changes, token });

export const deleteCollection = (id, token) => request(`/admin/collections/${id}`, { method: "DELETE", token });

// Turns a product into a collection (same name, photo, category) and keeps the
// product inside it as the first design.
// Archives a product its collection stands for; its old link then opens the collection.
export const retireProductIntoCollection = (productId, token) =>
  request(`/admin/products/${productId}/retire-into-collection`, { method: "POST", token });

export const makeProductCollection = (productId, token) =>
  request(`/admin/products/${productId}/make-collection`, { method: "POST", token });
