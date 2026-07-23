import { getApp, getApps, initializeApp } from "firebase/app";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
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
  // build environment and `import.meta.env.DEV` is false there regardless.
  // The server side needs FIREBASE_AUTH_EMULATOR_HOST set on the API process,
  // which firebase-admin honours natively.
  const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  if (import.meta.env.DEV && emulatorHost) {
    connectAuthEmulator(firebaseAuth, `http://${emulatorHost}`, { disableWarnings: true });
    console.warn(`[firebase] Auth is pointed at the LOCAL EMULATOR at ${emulatorHost} - logins here are test fixtures.`);
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
 * Customer sessions are intentionally persistent now.
 *
 * The previous build offered a session-only mode. The product requirement is
 * now simpler: once someone signs in successfully, they stay signed in on
 * this device until they explicitly log out. Keeping the helpers exported
 * avoids touching every caller at once while making the behavior
 * deterministic.
 */
export const getRememberMePreference = () => true;

export const setRememberMePreference = () => {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, "true");
  } catch {
    // Persistence is enforced in Firebase itself; this flag is only kept so
    // older builds do not leave a stale false behind.
  }
};

/**
 * Applies the storefront-wide persistence policy.
 *
 * All customer sessions use browser-local persistence so a refresh or browser
 * restart restores the Firebase credential until the customer signs out.
 * Must still be awaited BEFORE any sign-in call, since persistence applies to
 * credentials stored after it is set.
 */
export const ensureFirebasePersistence = async () => {
  const auth = ensureFirebaseAuth();
  const desired = browserLocalPersistence;

  if (appliedPersistence !== desired) {
    appliedPersistence = desired;
    authPersistencePromise = setPersistence(auth, desired);
  }

  await authPersistencePromise;
  return auth;
};

export { firebaseApp, firebaseAuth, firestoreDb, missingFirebaseMessage };
