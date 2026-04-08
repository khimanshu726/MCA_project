import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import path from "node:path";
import authRoutes from "./routes/authRoutes.js";
import { appConfig } from "./config.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import passport, { configurePassport } from "./auth/passport.js";
import { ensureDefaultAdminUser } from "./services/userStore.js";

const app = express();
configurePassport();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "Elite Empressions order API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

app.use((error, req, res, _next) => {
  const status = error.statusCode || 500;
  console.error(`[API ERROR] ${req.method} ${req.originalUrl}`, error);
  res.status(status).json({
    message: error.message || "Something went wrong on the server.",
  });
});

const startServer = async (port = appConfig.apiPort) => {
  await ensureDefaultAdminUser();

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
