import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { User } from "../models/User.js";
import { getUploadStorageStatus, isUploadStorageDurable } from "../config/uploadStorage.js";

/**
 * Product photo uploads.
 *
 * The load-bearing test here is the production guard. Without Cloudinary the
 * server writes to local disk, and Render erases local disk on every redeploy —
 * so accepting the upload means promising to keep a file that is already
 * doomed. Refusing loudly is the only honest answer.
 */
let mongoServer;
let adminToken;
let userToken;

// A real 1x1 PNG, so multer sees a genuine file rather than a shape we invented.
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const uploadsDir = path.resolve(process.cwd(), "uploads");

/** Deletes files this suite wrote, never the tracked .gitkeep. */
const cleanUploads = () => {
  for (const entry of readdirSync(uploadsDir, { withFileTypes: true })) {
    if (entry.name !== ".gitkeep") {
      rmSync(path.join(uploadsDir, entry.name), { recursive: true, force: true });
    }
  }
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("product-image-upload-test"));
  mkdirSync(uploadsDir, { recursive: true });

  const admin = await User.create({ id: "img-admin", name: "Admin", email: "imgadmin@ee.com", role: "admin" });
  const user = await User.create({ id: "img-user", name: "User", email: "imguser@ee.com", role: "user" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
  userToken = jwt.sign({ sub: user.id }, appConfig.jwtSecret);
});

const envSnapshot = {};
beforeEach(() => {
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "NODE_ENV"]) {
    envSnapshot[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
  // Remove what we wrote, but leave the directory and its tracked .gitkeep:
  // disk uploads need it to exist, and `uploads/*` is gitignored precisely so
  // the folder survives while its contents don't.
  cleanUploads();
});

const upload = () => request(app).post("/api/admin/products/images").set("Authorization", `Bearer ${adminToken}`);

describe("upload storage status", () => {
  it("reports disk + durable in development", () => {
    expect(getUploadStorageStatus()).toEqual({ driver: "disk", durable: true, cloudinaryConfigured: false });
  });

  it("reports disk + NOT durable in production without Cloudinary", () => {
    process.env.NODE_ENV = "production";
    expect(isUploadStorageDurable()).toBe(false);
  });

  it("reports cloudinary + durable once configured in production", () => {
    process.env.NODE_ENV = "production";
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    expect(getUploadStorageStatus()).toEqual({ driver: "cloudinary", durable: true, cloudinaryConfigured: true });
  });

  it("never leaks the Cloudinary secret through health", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "demo";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secretMustNotLeak";

    const res = await request(app).get("/api/health").expect(200);

    expect(JSON.stringify(res.body)).not.toContain("secretMustNotLeak");
    expect(res.body.uploads).toEqual({ driver: "cloudinary", durable: true, cloudinaryConfigured: true });
  });
});

describe("POST /api/admin/products/images", () => {
  it("stores an image and returns its URL", async () => {
    const res = await upload().attach("images", PNG_1X1, "photo.png");

    expect(res.statusCode).toBe(201);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.images[0]).toMatch(/^\/uploads\/product-\d+-photo\.png$/);
  });

  it("accepts several images in one request and preserves their order", async () => {
    const res = await upload()
      .attach("images", PNG_1X1, "first.png")
      .attach("images", PNG_1X1, "second.png");

    expect(res.statusCode).toBe(201);
    expect(res.body.images).toHaveLength(2);
    expect(res.body.images[0]).toContain("first");
    expect(res.body.images[1]).toContain("second");
  });

  it("refuses the upload in production without Cloudinary rather than lose the file", async () => {
    process.env.NODE_ENV = "production";

    const res = await upload().attach("images", PNG_1X1, "doomed.png");

    expect(res.statusCode).toBe(503);
    expect(res.body.code).toBe("STORAGE_NOT_CONFIGURED");
    expect(res.body.message).toMatch(/CLOUDINARY_CLOUD_NAME/);
  });

  it("rejects a non-image file as a 400, not a 500", async () => {
    const res = await upload().attach("images", Buffer.from("%PDF-1.4"), {
      filename: "artwork.pdf",
      contentType: "application/pdf",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/PNG, JPG, and WebP/);
  });

  it("rejects an oversized image as a 400, not a 500", async () => {
    const tooBig = Buffer.alloc(6 * 1024 * 1024, 1);

    const res = await upload().attach("images", tooBig, { filename: "huge.png", contentType: "image/png" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/File too large/i);
  });

  it("400s when no file is attached", async () => {
    const res = await upload();

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/at least one image/i);
  });

  it("blocks non-admins", async () => {
    const res = await request(app)
      .post("/api/admin/products/images")
      .set("Authorization", `Bearer ${userToken}`)
      .attach("images", PNG_1X1, "photo.png");

    expect(res.statusCode).toBe(403);
  });

  it("blocks unauthenticated requests", async () => {
    const res = await request(app).post("/api/admin/products/images").attach("images", PNG_1X1, "photo.png");
    expect(res.statusCode).toBe(401);
  });
});
