import { initializeApp } from "firebase/app";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";

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
let authPersistencePromise = null;

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseAuth.languageCode = "en";
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

export const ensureFirebasePersistence = async () => {
  const auth = ensureFirebaseAuth();

  if (!authPersistencePromise) {
    authPersistencePromise = setPersistence(auth, browserLocalPersistence);
  }

  await authPersistencePromise;
  return auth;
};

export { firebaseApp, firebaseAuth, missingFirebaseMessage };
