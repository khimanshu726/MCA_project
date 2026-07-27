import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { appConfig } from "../config.js";

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

const requireAdminAuth = () => {
  if (!isFirebaseAdminConfigured()) {
    const error = new Error("Firebase Admin authentication is not configured on the server.");
    error.statusCode = 503;
    throw error;
  }

  return getAuth();
};

/**
 * `checkRevoked` is passed deliberately, and it is what makes signing out
 * mean something on the server.
 *
 * Without it, verifyIdToken only checks the signature and expiry — so an ID
 * token minted before a logout stayed valid for up to an hour afterwards, and
 * revokeRefreshTokens had no effect on requests already holding one. "Log out
 * everywhere" was cosmetic. With it, Firebase compares the token's issued-at
 * against the user's tokensValidAfterTime and rejects anything minted before
 * the revocation.
 *
 * The cost is a user-record lookup per verification rather than a pure
 * signature check. That is the price of server-side logout actually working,
 * and it is the right trade for an account that holds addresses and orders.
 */
export const verifyFirebaseIdToken = async (idToken) => {
  const auth = requireAdminAuth();

  try {
    return await auth.verifyIdToken(idToken, true);
  } catch (error) {
    if (error?.code === "auth/id-token-revoked") {
      const revokedError = new Error("This session was signed out.");
      revokedError.statusCode = 401;
      revokedError.reason = "SESSION_REVOKED";
      throw revokedError;
    }
    throw error;
  }
};

/**
 * Ends every session for this user, everywhere. Paired with the checkRevoked
 * above, this is what turns "log out" from a client-side state reset into an
 * actual server-side invalidation that other devices and tabs cannot ignore.
 */
export const revokeFirebaseSessions = async (uid) => {
  const auth = requireAdminAuth();
  await auth.revokeRefreshTokens(uid);
};

/**
 * `ActionCodeSettings` for the generated security links.
 *
 * `url` is the CONTINUE url (where the customer lands after finishing the
 * action), NOT the action handler itself — the handler is still governed by the
 * Firebase Console "custom action URL" (see docs/AUTH.md). We point both at
 * /auth/action so the whole flow stays on the branded page. Built lazily so a
 * test overriding storefrontUrl is honoured.
 */
const actionCodeSettings = () => ({
  url: `${appConfig.storefrontUrl}/auth/action`,
  handleCodeInApp: false,
});

/**
 * Generate the password-reset / email-verification links server-side, so the
 * email can be composed and sent as branded HTML through Resend rather than by
 * Firebase's own mailer (Option B — see docs/EMAIL_DELIVERY_OPTIONS.md).
 *
 * Each returns a fully-formed URL embedding a single-use `oobCode`; the redeem
 * still happens client-side on /auth/action. `generatePasswordResetLink` throws
 * `auth/user-not-found` for an unknown address — the caller MUST treat that as
 * a non-event to avoid leaking which emails are registered.
 */
export const buildPasswordResetLink = (email) =>
  requireAdminAuth().generatePasswordResetLink(email, actionCodeSettings());

export const buildEmailVerificationLink = (email) =>
  requireAdminAuth().generateEmailVerificationLink(email, actionCodeSettings());
