import { authorizeRoles } from "./authorizeRoles.js";
import { authenticateRequest } from "./authenticateRequest.js";

export const authenticateAdmin = async (req, res, next) => {
  return authenticateRequest(req, res, () =>
    authorizeRoles("admin")(req, res, () => {
      req.admin = req.auth;
      return next();
    }),
  );
};
