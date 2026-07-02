import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

dotenv.config();

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "",
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "",
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
};

export const isFirebaseAdminConfigured = () =>
  Boolean(firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey);

if (isFirebaseAdminConfigured() && getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: firebaseAdminConfig.projectId,
      clientEmail: firebaseAdminConfig.clientEmail,
      privateKey: firebaseAdminConfig.privateKey,
    }),
  });
}

export const verifyFirebaseIdToken = async (idToken) => {
  if (!isFirebaseAdminConfigured()) {
    const error = new Error("Firebase Admin authentication is not configured on the server.");
    error.statusCode = 503;
    throw error;
  }

  return getAuth().verifyIdToken(idToken);
};
