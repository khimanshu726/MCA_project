import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  ensureFirebaseAuth,
  ensureFirebasePersistence,
  facebookProvider,
  firestoreDb,
  googleProvider,
} from "../lib/firebase";
import { devError } from "../utils/logger";

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

export const syncCustomerUserDocument = async (user, profile = {}) => {
  if (!user || !firestoreDb) {
    return null;
  }

  try {
    const userRef = doc(firestoreDb, "users", user.uid);
    const snapshot = await getDoc(userRef);
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

    await setDoc(userRef, payload, { merge: true });
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
  await syncCustomerUserDocument(currentUser, {
    firstName,
    lastName,
    displayName,
    provider: "email",
  });

  if (!currentUser.emailVerified) {
    await sendEmailVerification(currentUser);
  }

  await currentUser.reload();
  await currentUser.getIdToken(true);
  return resolveCurrentUser(auth, currentUser);
};

export const signInCustomerWithEmail = async ({ email, password }) => {
  const auth = await ensureFirebasePersistence();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const currentUser = resolveCurrentUser(auth, credential.user);
  await syncCustomerUserDocument(currentUser, { provider: "email" });
  await currentUser.getIdToken(true);
  return currentUser;
};

export const signInCustomerWithGoogle = async () => {
  const auth = await ensureFirebasePersistence();
  const credential = await signInWithPopup(auth, googleProvider);
  const currentUser = resolveCurrentUser(auth, credential.user);
  await syncCustomerUserDocument(currentUser, { provider: "google" });
  await currentUser.getIdToken(true);
  return currentUser;
};

export const signInCustomerWithFacebook = async () => {
  const auth = await ensureFirebasePersistence();
  const credential = await signInWithPopup(auth, facebookProvider);
  const currentUser = resolveCurrentUser(auth, credential.user);
  await syncCustomerUserDocument(currentUser, { provider: "facebook" });
  await currentUser.getIdToken(true);
  return currentUser;
};

export const sendCustomerPasswordReset = async (email) => {
  const auth = ensureFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
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

  await sendEmailVerification(user);
  await syncCustomerUserDocument(user, { provider: resolveProvider(user, "email") });
};

export const isPasswordProviderUser = (user) =>
  Boolean(user?.providerData?.some((provider) => provider.providerId === "password"));
