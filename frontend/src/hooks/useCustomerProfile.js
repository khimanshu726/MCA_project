import { fetchCustomerProfile } from "../lib/api";

/**
 * Profile fetching + Firebase user fallback mapper.
 * Extracted from UserAuthContext to reduce complexity there.
 */
export function mapFirebaseUserFallback(user) {
  if (!user) {
    return null;
  }

  const primaryProviderId = user.providerData?.[0]?.providerId || user.providerId || "";
  const provider =
    primaryProviderId === "google.com"
      ? "google"
      : primaryProviderId === "facebook.com"
        ? "facebook"
        : primaryProviderId === "phone"
          ? "mobile"
          : "firebase";

  return {
    id: user.uid,
    email: user.email || "",
    mobile: user.phoneNumber ? user.phoneNumber.replace(/^\+91/, "") : "",
    provider,
    profileImage: user.photoURL || "",
    role: "customer",
    createdAt: user.metadata?.creationTime || "",
  };
}

/**
 * Fetches the customer profile from the backend, falling back to Firebase user data.
 * Returns { user, token } on success.
 */
export async function loadCustomerProfile(firebaseUser) {
  const nextToken = await firebaseUser.getIdToken();
  try {
    const profileResponse = await fetchCustomerProfile(nextToken);
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
