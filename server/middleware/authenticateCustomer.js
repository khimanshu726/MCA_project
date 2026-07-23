import { verifyFirebaseIdToken } from "../config/firebaseAdmin.js";
import { mapUserForClient } from "../utils/authHelpers.js";
import { upsertCustomerFromFirebaseClaims } from "../services/userStore.js";
// Same module the browser uses, so the two sides cannot disagree about when a
// session is over — the drift this shares a shape with is the cart/stock one.
import { isSessionMaxAgeExceeded } from "../../src/auth/sessionPolicy.js";

/**
 * The server-side session ceiling.
 *
 * `auth_time` is the instant the user actually proved who they were. It is
 * signed by Google, survives every token refresh, and cannot be edited by the
 * client — which is precisely why the maximum session age is enforced against
 * it here rather than against anything the browser reports.
 *
 * The ceiling applied is always the REMEMBERED one (the longest we ever
 * allow). The shorter not-remembered window is enforced on the client, by
 * choosing session-scoped persistence so the credential is never written to
 * disk at all, plus an idle timeout. That split is safe in the direction that
 * matters: the client can only ever end a session earlier than this, never
 * extend it past this ceiling.
 */
const assertSessionWithinMaxAge = (decodedToken) => {
  const authTimeMs = Number(decodedToken.auth_time) * 1000;

  if (isSessionMaxAgeExceeded(authTimeMs, true)) {
    const error = new Error("Your session has ended. Please sign in again.");
    error.statusCode = 401;
    error.reason = "SESSION_EXPIRED";
    throw error;
  }
};

const applyCustomerFromToken = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const decodedToken = await verifyFirebaseIdToken(token);
  assertSessionWithinMaxAge(decodedToken);
  const user = await upsertCustomerFromFirebaseClaims(decodedToken);

  req.customer = {
    ...mapUserForClient(user),
    id: user.id,
  };
  req.auth = req.customer;
  req.userRecord = user;

  // Straight off the signed token, where they can't be forged: which provider
  // authenticated this request, and whether the address is verified. The email
  // verification gate (requireVerifiedEmail) reads these — never a value the
  // client could set.
  req.firebaseClaims = {
    signInProvider: decodedToken.firebase?.sign_in_provider || "",
    emailVerified: Boolean(decodedToken.email_verified),
  };

  return req.customer;
};

// A 503 means the server can't verify anyone (Firebase Admin unconfigured).
// That is our fault, not the customer's, and it must never be reported as
// "your session expired" — that sends them round a login loop that cannot
// possibly succeed. The `reason` lets the client tell the two apart without
// parsing prose.
const respondWithAuthError = (res, error) => {
  const statusCode = error.statusCode || 401;

  if (statusCode === 503) {
    return res.status(503).json({ code: "AUTH_UNAVAILABLE", message: error.message });
  }

  return res.status(statusCode).json({
    code: error.reason || "SESSION_INVALID",
    message: error.reason ? error.message : "Session expired. Please sign in again.",
  });
};

export const authenticateCustomer = async (req, res, next) => {
  try {
    const customer = await applyCustomerFromToken(req);

    if (!customer) {
      return res.status(401).json({ code: "AUTH_REQUIRED", message: "Authentication required." });
    }

    return next();
  } catch (error) {
    return respondWithAuthError(res, error);
  }
};

/**
 * For routes a guest may legitimately use — checkout being the one that
 * matters. A request with no credentials is a genuine guest and proceeds.
 *
 * A request that DOES present a token and fails verification does not. This
 * used to swallow the error and continue as a guest, which sounds forgiving
 * and was destructive: createOrder stores `customerId: req.customer?.id`, so a
 * signed-in customer whose token couldn't be verified had their order written
 * with no owner. It vanished from their history permanently — the link was
 * never recorded, so no later fix restores it. Exactly that happened in
 * production, where FIREBASE_ADMIN_* was unset and every verification threw.
 *
 * Someone holding a token is telling us who they are. If we can't confirm it,
 * the honest answer is to stop, not to quietly file their purchase under
 * nobody.
 */
export const optionalAuthenticateCustomer = async (req, res, next) => {
  const hasCredentials = req.headers.authorization?.startsWith("Bearer ");

  if (!hasCredentials) {
    return next();
  }

  try {
    await applyCustomerFromToken(req);
    return next();
  } catch (error) {
    return respondWithAuthError(res, error);
  }
};
