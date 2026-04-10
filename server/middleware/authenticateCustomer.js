import jwt from "jsonwebtoken";
import { appConfig } from "../config.js";
import { findUserById } from "../services/userStore.js";
import { mapUserForClient } from "../utils/authHelpers.js";

export const authenticateCustomer = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, appConfig.jwtSecret);
    const user = await findUserById(payload.sub);

    if (!user || user.role !== "customer") {
      return res.status(401).json({ message: "Customer account not found for this session." });
    }

    req.customer = {
      ...mapUserForClient(user),
      id: user.id,
    };
    req.userRecord = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please log in again." });
  }
};
