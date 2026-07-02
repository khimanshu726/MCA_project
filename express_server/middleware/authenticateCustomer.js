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

export const optionalAuthenticateCustomer = async (req, res, next) => {
  try {
    await applyCustomerFromToken(req);
    return next();
  } catch {
    return next();
  }
};
