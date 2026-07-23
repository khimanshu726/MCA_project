import { fetchCustomerProfile } from "../lib/api";

const PROVIDER_ID_MAP = {
  "google.com": "google",
  "facebook.com": "facebook",
  phone: "mobile",
};

export const CUSTOMER_PROFILE_TIMEOUT_MS = 5000;

function resolveProviderLabel(user) {
  const primaryProviderId = user.providerData?.[0]?.providerId || user.providerId || "";
  return PROVIDER_ID_MAP[primaryProviderId] || "firebase";
}

function stripCountryCode(phoneNumber) {
  if (!phoneNumber) return "";
  return phoneNumber.replace(/^\+91/, "");
}

/**
 * Profile fetching + Firebase user fallback mapper.
 * Extracted from UserAuthContext to reduce complexity there.
 */
export function mapFirebaseUserFallback(user) {
  if (!user) return null;

  return {
    id: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    emailVerified: Boolean(user.emailVerified),
    mobile: stripCountryCode(user.phoneNumber),
    provider: resolveProviderLabel(user),
    profileImage: user.photoURL || "",
    role: "customer",
    createdAt: user.metadata?.creationTime || "",
  };
}

/**
 * Fetches the customer profile from the backend, falling back to Firebase user data.
 * Returns { user, token } on success.
 */
export async function loadCustomerProfile(firebaseUser, { timeoutMs = CUSTOMER_PROFILE_TIMEOUT_MS } = {}) {
  const nextToken = await firebaseUser.getIdToken();

  try {
    const profileResponse = await fetchCustomerProfile(nextToken, timeoutMs);
    return {
      token: nextToken,
      user: profileResponse.user || mapFirebaseUserFallback(firebaseUser),
    };
  } catch {
    return {
      token: nextToken,
      user: mapFirebaseUserFallback(firebaseUser),
    };
  }
}
