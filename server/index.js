import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import authRoutes from "./routes/authRoutes.js";
import { appConfig } from "./config.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import checkoutRoutes from "./routes/checkoutRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import designRoutes from "./routes/designRoutes.js";
import razorpayInstance from "./config/razorpay.js";
import { getUploadStorageStatus } from "./config/uploadStorage.js";
import passport, { configurePassport } from "./auth/passport.js";
import { ensureDefaultAdminUser } from "./services/userStore.js";
import { ensureProductsSeeded } from "./services/productMigration.js";
import { ensureCouponsSeeded } from "./services/couponSeed.js";
import { connectDB } from "./config/db.js";
import { authenticateCustomer } from "./middleware/authenticateCustomer.js";

const app = express();
configurePassport();
const distPath = path.resolve(process.cwd(), "dist");
const distAdminPath = path.resolve(process.cwd(), "dist-admin");
const allowedOrigins = appConfig.allowedOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
  }),
);
// Webhook signature verification needs the raw request bytes, so this route
// is mounted with express.raw BEFORE the global JSON parser (which would
// otherwise consume and re-shape the body).
app.use("/api/webhooks/razorpay", express.raw({ type: "application/json" }), webhookRoutes);

// Design states carry full layer transforms plus a small preview data URL,
// so this router gets its own JSON parser with a larger limit. Mounted
// before the global express.json() (100kb default) for the same
// first-parser-wins reason as the webhook route above.
app.use("/api/designs", authenticateCustomer, express.json({ limit: "4mb" }), designRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

/**
 * Health, plus config readiness for the two subsystems that fail silently.
 *
 * `razorpay` reports whether the credentials reached the process — never what
 * they are. The secret is only ever described as a boolean, not by value,
 * prefix, or length. The key id's last 4 are included because that value is
 * public by design (Vite inlines it into the browser bundle), and matching it
 * against the bundle is the only way to catch a frontend/backend key mismatch.
 * This exists because a missing env var was otherwise observable only by
 * POSTing a real order, which reserves live stock.
 *
 * `uploads` is the same class of bug caught earlier: without Cloudinary the
 * server writes to local disk, which on Render is erased every redeploy. That
 * was silently destroying customer artwork attached to paid orders. `durable`
 * answers "will an uploaded file still exist tomorrow" without uploading one.
 */
app.get("/api/health", (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const mode = keyId.startsWith("rzp_live_") ? "live" : keyId.startsWith("rzp_test_") ? "test" : null;

  res.json({
    ok: true,
    service: "Elite Empressions order API",
    razorpay: {
      configured: Boolean(razorpayInstance),
      webhookSecretSet: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
      mode,
      keyIdLast4: keyId ? keyId.slice(-4) : null,
    },
    uploads: getUploadStorageStatus(),
  });
});

app.use("/api", checkoutRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", authenticateCustomer, cartRoutes);
app.use("/api/wishlist", authenticateCustomer, wishlistRoutes);
app.use("/api/addresses", authenticateCustomer, addressRoutes);

if (process.env.NODE_ENV === "production") {
  app.use("/admin", express.static(distAdminPath));
  app.use(express.static(distPath));

  app.get(/^\/admin(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(distAdminPath, "index.html"));
  });

  app.get(/^(?!\/api\/|\/uploads\/|\/admin(?:\/|$)).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.use((error, req, res, _next) => {
  // Multer signals oversized/too-many/unexpected files by throwing. They're all
  // caller mistakes, so they get a 400 with multer's own message ("File too
  // large") rather than reading as a server fault.
  const status = error.statusCode || (error.name === "MulterError" ? 400 : 500);

  if (status >= 500) {
    console.error(`[API ERROR] ${req.method} ${req.originalUrl}`, error);
  }

  res.status(status).json({
    message: error.message || "Something went wrong on the server.",
  });
});

const startServer = async (port = appConfig.apiPort) => {
  await connectDB();
  await ensureDefaultAdminUser();
  await ensureProductsSeeded();
  await ensureCouponsSeeded();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Order API running on http://localhost:${port}`);
      resolve(server);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. Stop the old Node server first, then restart this API.`);
      }

      reject(error);
    });
  });
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer().catch((error) => {
    console.error("Failed to start the order API.", error);
    process.exit(1);
  });
}

export { app, startServer };
