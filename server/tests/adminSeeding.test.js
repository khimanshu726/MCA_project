import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../models/User.js";

/**
 * server/config.js ships a default admin password, committed to a public repo.
 * On a laptop that's a convenience. On a deployment it is a published login: it
 * gave production an admin account whose credentials anyone reading the repo
 * could use, and nothing said so.
 */
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("admin-seeding-test"));
});

const envSnapshot = {};
beforeEach(() => {
  for (const key of ["NODE_ENV", "ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_PASSWORD_HASH"]) {
    envSnapshot[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(async () => {
  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await User.deleteMany({});
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// No module juggling needed: the guards read process.env when called.
const loadUserStore = () => import("../services/userStore.js");

describe("ensureDefaultAdminUser", () => {
  it("seeds a convenience admin in development", async () => {
    const { ensureDefaultAdminUser } = await loadUserStore();

    const admin = await ensureDefaultAdminUser();

    expect(admin).toBeTruthy();
    expect(admin.role).toBe("admin");
    expect(await User.countDocuments({ role: "admin" })).toBe(1);
  });

  it("REFUSES to seed an admin in production when no password is configured", async () => {
    process.env.NODE_ENV = "production";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ensureDefaultAdminUser } = await loadUserStore();

    const admin = await ensureDefaultAdminUser();

    expect(admin).toBeNull();
    // The account must not exist at all — a published-credential admin is a
    // backdoor, not a fallback.
    expect(await User.countDocuments({ role: "admin" })).toBe(0);
    expect(error.mock.calls[0][0]).toMatch(/Refusing to create the default admin/);
  });

  it("seeds an admin in production once a password IS configured", async () => {
    process.env.NODE_ENV = "production";
    process.env.ADMIN_PASSWORD = "a-real-chosen-password";
    const { ensureDefaultAdminUser } = await loadUserStore();

    const admin = await ensureDefaultAdminUser();

    expect(admin).toBeTruthy();
    expect(admin.role).toBe("admin");
  });

  it("warns when an existing production admin still uses the published default", async () => {
    const { PUBLISHED_DEFAULT_ADMIN_PASSWORD, appConfig } = await import("../config.js");
    await User.create({
      id: "legacy-admin",
      email: appConfig.adminEmail,
      mobile: appConfig.adminPhone,
      password: bcrypt.hashSync(PUBLISHED_DEFAULT_ADMIN_PASSWORD, 10),
      provider: "email",
      role: "admin",
    });

    process.env.NODE_ENV = "production";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ensureDefaultAdminUser } = await loadUserStore();

    const admin = await ensureDefaultAdminUser();

    // Deliberately NOT rotated — locking the operator out of their own panel
    // would be worse than telling them plainly.
    expect(admin).toBeTruthy();
    expect(error).toHaveBeenCalled();
    expect(error.mock.calls.some((c) => /SECURITY/.test(c[0]))).toBe(true);
  });

  it("stays quiet when the production admin has a real password", async () => {
    const { appConfig } = await import("../config.js");
    await User.create({
      id: "good-admin",
      email: appConfig.adminEmail,
      mobile: appConfig.adminPhone,
      password: bcrypt.hashSync("something-nobody-published", 10),
      provider: "email",
      role: "admin",
    });

    process.env.NODE_ENV = "production";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ensureDefaultAdminUser } = await loadUserStore();

    await ensureDefaultAdminUser();

    expect(error.mock.calls.some((c) => /SECURITY/.test(String(c[0])))).toBe(false);
  });
});
