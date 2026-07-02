import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const fallbackAdminPassword = process.env.ADMIN_PASSWORD || "EliteAdmin@123";

const parseOriginList = (...values) => {
  const originSet = new Set();

  values
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((origin) => {
      originSet.add(origin);

      try {
        const url = new URL(origin);

        if (url.hostname === "localhost") {
          url.hostname = "127.0.0.1";
          originSet.add(url.origin);
        } else if (url.hostname === "127.0.0.1") {
          url.hostname = "localhost";
          originSet.add(url.origin);
        }
      } catch {
        // Ignore invalid origin entries.
      }
    });

  return [...originSet];
};

export const appConfig = {
  apiPort: Number(process.env.PORT || process.env.API_PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  adminAppOrigin: process.env.ADMIN_APP_ORIGIN || "http://localhost:5174",
  allowedOrigins: parseOriginList(
    process.env.CLIENT_ORIGIN || "http://localhost:5173",
    process.env.ADMIN_APP_ORIGIN || "http://localhost:5174",
    process.env.CLIENT_ORIGINS || "",
  ),
  jwtSecret: process.env.JWT_SECRET || "elite-empressions-local-secret",
  adminEmail: process.env.ADMIN_EMAIL || "admin@elite-empressions.local",
  adminPhone: process.env.ADMIN_PHONE || "9876543210",
  adminName: process.env.ADMIN_NAME || "Elite Empressions Admin",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(fallbackAdminPassword, 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback",
  authSuccessRedirect: process.env.AUTH_SUCCESS_REDIRECT || "http://localhost:5174/admin/auth/callback",
  authFailureRedirect: process.env.AUTH_FAILURE_REDIRECT || "http://localhost:5174/admin/login",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "orders@elite-empressions.local",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "admin@elite-empressions.local",
};
