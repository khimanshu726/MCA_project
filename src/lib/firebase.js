import { getApp, getApps, initializeApp } from "firebase/app";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

const missingFirebaseMessage =
  "Firebase authentication is not configured. Add the Vite Firebase environment variables before using customer sign-in.";

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let authPersistencePromise = null;
let appliedPersistence = null;

if (isFirebaseConfigured) {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firestoreDb = getFirestore(firebaseApp);
  firebaseAuth.languageCode = "en";

  // Firebase Auth emulator, for end-to-end testing the authenticated pages
  // (account, addresses, wishlist, orders) without touching real accounts.
  //
  // Only wired when BOTH are true: a dev build, and the developer has set
  // VITE_FIREBASE_AUTH_EMULATOR_HOST (e.g. in an untracked .env.local). VITE_
  // vars are inlined at build time, so a production build compiles this whole
  // branch away unless someone deliberately sets the var in the production
  // build environment — and `import.meta.env.DEV` is false there regardless.
  // The server side needs FIREBASE_AUTH_EMULATOR_HOST set on the API process,
  // which firebase-admin honours natively.
  const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  if (import.meta.env.DEV && emulatorHost) {
    connectAuthEmulator(firebaseAuth, `http://${emulatorHost}`, { disableWarnings: true });
    console.warn(`[firebase] Auth is pointed at the LOCAL EMULATOR at ${emulatorHost} — logins here are test fixtures.`);
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({ display: "popup" });

export const ensureFirebaseAuth = () => {
  if (!firebaseAuth) {
    throw new Error(missingFirebaseMessage);
  }

  return firebaseAuth;
};

const REMEMBER_ME_KEY = "ee-auth-remember-me";

/**
 * Whether the customer asked to stay signed in on this device.
 *
 * Stored in localStorage on purpose, and note what it is NOT: this is a UI
 * preference, not a credential. Nothing is authorized by it. Flipping it by
 * hand changes which persistence Firebase uses on the next sign-in and
 * nothing else — it cannot extend a session, because the server enforces the
 * maximum age against the signed auth_time claim regardless.
 */
export const getRememberMePreference = () => {
  try {
    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  } catch {
    return false;
  }
};

export const setRememberMePreference = (rememberMe) => {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? "true" : "false");
  } catch {
    // Private mode: fall through to the not-remembered default.
  }
};

/**
 * Applies the persistence the customer's choice implies.
 *
 * This is the fix for "logged in forever". The previous code pinned
 * browserLocalPersistence unconditionally, and Firebase refresh tokens never
 * expire — so one Google sign-in authenticated that browser permanently, until
 * someone cleared site data. No shop behaves that way.
 *
 * Not remembered now means browserSessionPersistence: the refresh token lives
 * in the tab's session storage and is gone when the browser closes. That is
 * enforced by never writing the credential to disk, so no client-side timer
 * can be bypassed to defeat it.
 *
 * Must be awaited BEFORE any sign-in call, since persistence applies to
 * credentials stored after it is set.
 */
export const ensureFirebasePersistence = async (rememberMe = getRememberMePreference()) => {
  const auth = ensureFirebaseAuth();
  const desired = rememberMe ? browserLocalPersistence : browserSessionPersistence;

  if (appliedPersistence !== desired) {
    appliedPersistence = desired;
    authPersistencePromise = setPersistence(auth, desired);
  }

  await authPersistencePromise;
  return auth;
};

export { firebaseApp, firebaseAuth, firestoreDb, missingFirebaseMessage };
