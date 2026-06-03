export const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    const userRole = req.userRecord?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }

    return next();
  };
