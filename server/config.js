import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const fallbackAdminPassword = process.env.ADMIN_PASSWORD || "EliteAdmin@123";

export const appConfig = {
  apiPort: Number(process.env.PORT || process.env.API_PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "elite-empressions-local-secret",
  adminEmail: process.env.ADMIN_EMAIL || "admin@elite-empressions.local",
  adminPhone: process.env.ADMIN_PHONE || "9876543210",
  adminName: process.env.ADMIN_NAME || "Elite Empressions Admin",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(fallbackAdminPassword, 10),
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/api/auth/google/callback",
  authSuccessRedirect: process.env.AUTH_SUCCESS_REDIRECT || "http://localhost:5173/admin/auth/callback",
  authFailureRedirect: process.env.AUTH_FAILURE_REDIRECT || "http://localhost:5173/admin/login",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "orders@elite-empressions.local",
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "admin@elite-empressions.local",
};
