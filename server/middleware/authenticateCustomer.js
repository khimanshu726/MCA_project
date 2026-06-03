import { authorizeRoles } from "./authorizeRoles.js";
import { authenticateRequest } from "./authenticateRequest.js";
import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";
import { findUserById } from "../services/userStore.js";
import { mapUserForClient } from "../utils/authHelpers.js";

export const authenticateCustomer = async (req, res, next) => {
  return authenticateRequest(req, res, () =>
    authorizeRoles("customer")(req, res, () => {
      req.customer = req.auth;
      return next();
    }),
  );
};

export const optionalAuthenticateCustomer = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, appConfig.jwtSecret);
    const user = await findUserById(payload.sub);

    if (user && user.role === "customer") {
      req.customer = {
        ...mapUserForClient(user),
        id: user.id,
      };
      req.userRecord = user;
    }
    return next();
  } catch {
    return next();
  }
};
