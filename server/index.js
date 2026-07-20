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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Elite Empressions order API" });
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
  const status = error.statusCode || 500;
  console.error(`[API ERROR] ${req.method} ${req.originalUrl}`, error);
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
