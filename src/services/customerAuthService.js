import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  verifyPasswordResetCode,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  ensureFirebaseAuth,
  ensureFirebasePersistence,
  facebookProvider,
  firestoreDb,
  googleProvider,
} from "../lib/firebase";
import { requestEmailVerificationEmail, requestPasswordResetEmail } from "../lib/api";
import { devError } from "../utils/logger";

/**
 * Sends the verification email for a signed-in customer through the backend
 * (Option B: branded Resend HTML). Falls back to Firebase's own mailer when the
 * server says it isn't handling it (provider:"firebase") or is unreachable, so
 * a signed-up customer is never left without a way to verify. Best-effort:
 * never throws.
 */
const dispatchVerificationEmail = async (user) => {
  try {
    const token = await user.getIdToken();
    const result = await requestEmailVerificationEmail(token);
    if (result?.provider === "firebase") {
      await sendEmailVerification(user);
    }
  } catch {
    // Backend unreachable / errored — fall back to Firebase-sent so the
    // customer still gets a verification email.
    await sendEmailVerification(user);
  }
};

const providerMap = {
  "google.com": "google",
  "facebook.com": "facebook",
  password: "email",
  phone: "mobile",
};

const resolveProvider = (user, fallbackProvider = "firebase") => {
  const primaryProvider = user?.providerData?.[0]?.providerId || user?.providerId || "";
  return providerMap[primaryProvider] || fallbackProvider;
};

const splitDisplayName = (displayName = "") => {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }

  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
};

/**
 * The Firestore "users" doc is a best-effort MIRROR — it is written here and
 * read nowhere in the app (the backend Mongo record, synced during
 * authenticateCustomer, is the source of truth). So it must never gate sign-in.
 *
 * Firestore has no request timeout: if the project's database is unreachable,
 * not provisioned, or blocked by rules, getDoc/setDoc don't fail fast — the SDK
 * retries for a long window. Awaiting that inside the sign-in path is exactly
 * what made Google login take ~a minute. We bound each op with a short timeout,
 * and the sign-in callers fire this without awaiting.
 */
const FIRESTORE_SYNC_TIMEOUT_MS = 4000;

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);

export const syncCustomerUserDocument = async (user, profile = {}) => {
  if (!user || !firestoreDb) {
    return null;
  }

  try {
    const userRef = doc(firestoreDb, "users", user.uid);
    const snapshot = await withTimeout(getDoc(userRef), FIRESTORE_SYNC_TIMEOUT_MS, "Firestore profile read");
    const existingData = snapshot.exists() ? snapshot.data() : {};
    const resolvedNames =
      profile.firstName || profile.lastName
        ? {
            firstName: profile.firstName || "",
            lastName: profile.lastName || "",
          }
        : splitDisplayName(user.displayName || existingData.displayName || "");

    const payload = {
      uid: user.uid,
      firstName: resolvedNames.firstName || existingData.firstName || "",
      lastName: resolvedNames.lastName || existingData.lastName || "",
      displayName: profile.displayName || user.displayName || existingData.displayName || "",
      email: user.email || existingData.email || "",
      photoURL: user.photoURL || existingData.photoURL || "",
      provider: profile.provider || existingData.provider || resolveProvider(user, "email"),
      lastLogin: serverTimestamp(),
      emailVerified: Boolean(user.emailVerified),
      role: existingData.role || "user",
      preferences: existingData.preferences || {},
    };

    if (!snapshot.exists()) {
      payload.createdAt = serverTimestamp();
    }

    await withTimeout(setDoc(userRef, payload, { merge: true }), FIRESTORE_SYNC_TIMEOUT_MS, "Firestore profile write");
    return payload;
  } catch (error) {
    devError("[Auth] Firestore profile sync failed", error);
    return null;
  }
};

const resolveCurrentUser = (auth, fallbackUser) => auth.currentUser || fallbackUser;

export const registerCustomerWithEmail = async ({ firstName, lastName, email, password }) => {
  const auth = await ensureFirebasePersistence();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const displayName = `${firstName} ${lastName}`.trim();

  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }

  const currentUser = resolveCurrentUser(auth, credential.user);
  // Background mirror only — never gate registration on Firestore.
  void syncCustomerUserDocument(currentUser, {
    firstName,
    lastName,
    displayName,
    provider: "email",
  });

  if (!currentUser.emailVerified) {
    await dispatchVerificationEmail(currentUser);
  }

  await currentUser.reload();
  await currentUser.getIdToken(true);
  return resolveCurrentUser(auth, currentUser);
};

export const signInCustomerWithEmail = async ({ email, password }) => {
  const auth = await ensureFirebasePersistence();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const currentUser = resolveCurrentUser(auth, credential.user);
  // Background mirror only — never gate sign-in on Firestore.
  void syncCustomerUserDocument(currentUser, { provider: "email" });
  await currentUser.getIdToken(true);
  return currentUser;
};

export const signInCustomerWithGoogle = async () => {
  const auth = await ensureFirebasePersistence();
  const credential = await signInWithPopup(auth, googleProvider);
  const currentUser = resolveCurrentUser(auth, credential.user);
  // Mirror to Firestore in the background — it's read nowhere and must not gate
  // sign-in (it swallows its own errors; see syncCustomerUserDocument).
  void syncCustomerUserDocument(currentUser, { provider: "google" });
  await currentUser.getIdToken(true);
  return currentUser;
};

export const signInCustomerWithFacebook = async () => {
  const auth = await ensureFirebasePersistence();
  const credential = await signInWithPopup(auth, facebookProvider);
  const currentUser = resolveCurrentUser(auth, credential.user);
  // Background mirror only — never gate sign-in on Firestore.
  void syncCustomerUserDocument(currentUser, { provider: "facebook" });
  await currentUser.getIdToken(true);
  return currentUser;
};

/**
 * Requests a password-reset email. Prefers the backend (Option B: branded
 * Resend HTML), and falls back to the Firebase client SDK when the server says
 * it isn't handling it (provider:"firebase") or can't be reached — so account
 * recovery keeps working even if the backend or Resend is down.
 *
 * The backend's reply is deliberately generic (it never reveals whether the
 * address is registered); this function mirrors that by never surfacing a
 * "no such account" signal to the caller.
 */
export const sendCustomerPasswordReset = async (email) => {
  try {
    const result = await requestPasswordResetEmail(email);
    if (result?.provider === "firebase") {
      const auth = ensureFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
    }
  } catch {
    // Backend unreachable — fall back to Firebase-sent so recovery still works.
    const auth = ensureFirebaseAuth();
    await sendPasswordResetEmail(auth, email);
  }
};

/**
 * Re-sends the verification email for the signed-in user.
 *
 * Throws rather than returning quietly when there is nothing to send. The old
 * version returned `undefined` for a missing user, a user with no email, or an
 * already-verified one — and the caller, seeing no exception, told the
 * customer "Verification email sent. Please check your inbox." That is the
 * worst possible outcome: a confident success for an email that was never
 * requested, indistinguishable from a delivery problem, and it sends people
 * hunting through spam folders for a message that does not exist.
 */
export const resendCurrentUserVerificationEmail = async (user) => {
  if (!user) {
    const error = new Error("You need to be signed in to request a verification email.");
    error.code = "auth/no-current-user";
    throw error;
  }

  if (!user.email) {
    const error = new Error("This account has no email address to verify.");
    error.code = "auth/missing-email";
    throw error;
  }

  if (user.emailVerified) {
    const error = new Error("This email is already verified.");
    error.code = "auth/already-verified";
    throw error;
  }

  await dispatchVerificationEmail(user);
  await syncCustomerUserDocument(user, { provider: resolveProvider(user, "email") });
};

export const isPasswordProviderUser = (user) =>
  Boolean(user?.providerData?.some((provider) => provider.providerId === "password"));

/**
 * The three action-code operations behind the branded /auth/action handler.
 *
 * Firebase's verification and password-reset emails carry an `oobCode`. With a
 * custom action URL configured in the Firebase console, that code arrives at
 * our own page instead of Firebase's default one, and these functions redeem
 * it — so the customer never leaves the Elite Impressions look, and an expired
 * or already-used link fails here where we can explain it, rather than on a
 * generic Google screen.
 */
export const applyEmailVerificationCode = async (oobCode) => {
  const auth = ensureFirebaseAuth();
  await applyActionCode(auth, oobCode);
};

/** Validates a reset code and returns the email it belongs to (for display). */
export const verifyResetCode = async (oobCode) => {
  const auth = ensureFirebaseAuth();
  return verifyPasswordResetCode(auth, oobCode);
};

export const confirmPasswordResetWithCode = async (oobCode, newPassword) => {
  const auth = ensureFirebaseAuth();
  await confirmPasswordReset(auth, oobCode, newPassword);
};
