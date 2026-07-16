import { verifyFirebaseIdToken } from "../config/firebaseAdmin.js";
import { mapUserForClient } from "../utils/authHelpers.js";
import { upsertCustomerFromFirebaseClaims } from "../services/userStore.js";

const applyCustomerFromToken = async (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const decodedToken = await verifyFirebaseIdToken(token);
  const user = await upsertCustomerFromFirebaseClaims(decodedToken);

  req.customer = {
    ...mapUserForClient(user),
    id: user.id,
  };
  req.auth = req.customer;
  req.userRecord = user;

  return req.customer;
};

export const authenticateCustomer = async (req, res, next) => {
  try {
    const customer = await applyCustomerFromToken(req);

    if (!customer) {
      return res.status(401).json({ message: "Authentication required." });
    }

    return next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      message: error.statusCode === 503 ? error.message : "Session expired. Please log in again.",
    });
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
    // 503 means the server can't verify anyone (Firebase Admin unconfigured).
    // That's our fault, not the customer's, and it must not read as "your
    // session expired" — that sends them round a login loop that cannot work.
    return res.status(error.statusCode || 401).json({
      message: error.statusCode === 503 ? error.message : "Session expired. Please log in again.",
    });
  }
};
