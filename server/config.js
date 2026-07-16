import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

/**
 * The password every deployment gets if nobody sets one — and it is committed
 * to a public repo, so it is a published credential, not a secret. Fine as a
 * convenience on a laptop; a live admin account behind it is a stranger's login.
 *
 * Exported so userStore can recognise an account still using it and say so.
 */
export const PUBLISHED_DEFAULT_ADMIN_PASSWORD = "EliteAdmin@123";

/**
 * Whether an operator actually chose the admin password, rather than
 * inheriting the published default. Read at call time, not import: a value
 * captured during the import graph can't be exercised by a test, and this one
 * decides whether production gets an account anyone can log into.
 */
export const hasExplicitAdminPassword = () =>
  Boolean(process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH);

export const isProduction = () => process.env.NODE_ENV === "production";

/** The bcrypt hash to seed the admin with, resolved when it is needed. */
export const resolveAdminPasswordHash = () =>
  process.env.ADMIN_PASSWORD_HASH ||
  bcrypt.hashSync(process.env.ADMIN_PASSWORD || PUBLISHED_DEFAULT_ADMIN_PASSWORD, 10);

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
  // Admin credentials are resolved at call time by the helpers above; see
  // services/userStore.js. `adminPasswordHash` deliberately isn't a field here
  // any more — an import-time hash of a default is what made this untestable.
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
