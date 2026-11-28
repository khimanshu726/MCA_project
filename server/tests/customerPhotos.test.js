import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import cloudinary from "../config/cloudinary.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { CustomerPhoto } from "../models/CustomerPhoto.js";
import { signPhotoLink, verifyPhotoLink } from "../services/customerPhotoLinks.js";

/**
 * A personalised product (photoUpload) takes the customer's photo: uploaded
 * first, then named by the order line. Photos are private: stored outside the
 * public /uploads folder (Cloudinary "private" in production) and opened only
 * through a signed link the admin asks for. Runs on the local-disk driver.
 */
const privateDir = path.resolve(process.cwd(), "private-uploads");
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const envSnapshot = {};
let mongoServer;
let adminToken;
// Photo files already there (e.g. from local development) are left alone:
// the test only counts and removes the ones it wrote itself.
let preexistingPhotoFiles = new Set();
const allPhotoFiles = () =>
  existsSync(privateDir) ? readdirSync(privateDir).filter((name) => name.startsWith("photo-")) : [];
const storedPhotoFiles = () => allPhotoFiles().filter((name) => !preexistingPhotoFiles.has(name));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("customer-photos-test"));
  mkdirSync(privateDir, { recursive: true });
  const admin = await User.create({ id: "photo-admin", name: "Admin", email: "photo-admin@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

beforeEach(async () => {
  preexistingPhotoFiles = new Set(allPhotoFiles());
  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    envSnapshot[key] = process.env[key];
    delete process.env[key];
  }
  const base = {
    description: "d",
    category: "Photo Gifts",
    images: ["https://example.com/i.jpg"],
    price: 650,
    mrp: 650,
    stock: 50,
    status: "active",
  };
  await Product.create([
    { ...base, id: "wall-art", name: "Personalized Wall Art", photoUpload: true },
    { ...base, id: "plain-mug", name: "Plain Mug" },
  ]);
});

afterEach(async () => {
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await Promise.all([Product.deleteMany({}), Order.deleteMany({}), CustomerPhoto.deleteMany({})]);
  for (const name of storedPhotoFiles()) unlinkSync(path.join(privateDir, name));
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);

const uploadPhoto = (productId, file = PNG_1X1, name = "family.png") =>
  request(app).post("/api/customer-photos").field("productId", productId).attach("photo", file, name);

const placeOrder = (lineItems) =>
  request(app)
    .post("/api/orders")
    .field({
      customerName: "Photo Buyer",
      phone: "9876543210",
      email: "photo-buyer@example.com",
      streetAddress: "1 Test St",
      city: "Purnia",
      state: "Bihar",
      pincode: "854301",
      paymentMethod: "cod",
    })
    .field("lineItems", JSON.stringify(lineItems));

describe("uploading a customer photo", () => {
  it("stores the photo privately and returns only its id and name, no link", async () => {
    const res = await uploadPhoto("wall-art");

    expect(res.status).toBe(201);
    expect(res.body.photo).toEqual({ id: expect.any(String), name: "family.png" });
    const saved = await CustomerPhoto.findOne({ id: res.body.photo.id }).lean();
    expect(saved).toMatchObject({ productId: "wall-art", orderId: "", storage: "disk", isPrivate: true, url: "" });
    const [file] = storedPhotoFiles();
    expect(file).toBe(saved.storageId);

    // Not reachable through the public /uploads folder.
    const publicTry = await request(app).get(`/uploads/${file}`);
    expect(publicTry.status).toBe(404);
  });

  it("refuses a product that doesn't take a photo, or an unknown one, and keeps no file", async () => {
    for (const productId of ["plain-mug", "no-such-product"]) {
      const res = await uploadPhoto(productId);
      expect(res.status).toBe(400);
    }
    expect(await CustomerPhoto.countDocuments()).toBe(0);
    expect(storedPhotoFiles()).toHaveLength(0);
  });

  it("refuses a file that isn't an image", async () => {
    const res = await uploadPhoto("wall-art", Buffer.from("%PDF-1.4"), "doc.pdf");
    expect(res.status).toBe(400);
    expect(await CustomerPhoto.countDocuments()).toBe(0);
  });

  it("asks for a photo when none is sent", async () => {
    const res = await request(app).post("/api/customer-photos").field("productId", "wall-art");
    expect(res.status).toBe(400);
  });
});

describe("opening a customer photo", () => {
  it("gives the admin a link that opens the photo until it expires", async () => {
    const { photo } = (await uploadPhoto("wall-art")).body;

    const linkRes = await asAdmin(request(app).get(`/api/admin/customer-photos/${photo.id}/link`));
    expect(linkRes.status).toBe(200);
    expect(linkRes.body.url).toMatch(new RegExp(`^/api/customer-photos/${photo.id}/view\\?expires=\\d+&sig=`));
    expect(new Date(linkRes.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(15 * 60 * 1000);

    const view = await request(app).get(linkRes.body.url);
    expect(view.status).toBe(200);
    expect(view.headers["content-type"]).toMatch(/image\/png/);
    expect(view.headers["cache-control"]).toMatch(/private/);
  });

  it("doesn't give links to anyone but the admin", async () => {
    const { photo } = (await uploadPhoto("wall-art")).body;
    const res = await request(app).get(`/api/admin/customer-photos/${photo.id}/link`);
    expect(res.status).toBe(401);
  });

  it("refuses a link that has expired, was altered, or is for another photo", async () => {
    const { photo } = (await uploadPhoto("wall-art")).body;

    const expired = signPhotoLink(photo.id, { now: Date.now() - 60 * 60 * 1000 });
    expect((await request(app).get(expired.url)).status).toBe(403);

    const fresh = signPhotoLink(photo.id);
    const tampered = fresh.url.replace(/expires=(\d+)/, (_m, n) => `expires=${Number(n) + 3600}`);
    expect((await request(app).get(tampered)).status).toBe(403);

    const otherId = fresh.url.replace(photo.id, "someone-elses-photo");
    expect((await request(app).get(otherId)).status).toBe(403);

    expect((await request(app).get(`/api/customer-photos/${photo.id}/view`)).status).toBe(403);
  });

  it("sends a private Cloudinary photo through Cloudinary's own expiring link", async () => {
    await CustomerPhoto.create({
      id: "cloud-photo",
      productId: "wall-art",
      storage: "cloudinary",
      storageId: "elite-empressions/customer-photos/123_family",
      format: "jpg",
      isPrivate: true,
    });
    const spy = vi
      .spyOn(cloudinary.utils, "private_download_url")
      .mockReturnValue("https://api.cloudinary.com/v1_1/demo/image/download?signed=1");
    const link = signPhotoLink("cloud-photo");

    const res = await request(app).get(link.url);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://api.cloudinary.com/v1_1/demo/image/download?signed=1");
    expect(spy).toHaveBeenCalledWith("elite-empressions/customer-photos/123_family", "jpg", {
      resource_type: "image",
      type: "private",
      expires_at: link.expires,
    });
  });

  it("checks signatures in constant shape: wrong length or missing parts are refused", () => {
    const { expires } = signPhotoLink("abc");
    expect(verifyPhotoLink("abc", expires, "short")).toBe(false);
    expect(verifyPhotoLink("abc", "soon", "x")).toBe(false);
    expect(verifyPhotoLink("", expires, "x")).toBe(false);
  });
});

describe("ordering a personalised product", () => {
  it("refuses the order without the customer's photo", async () => {
    const res = await placeOrder([{ productId: "wall-art", quantity: 1 }]);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PHOTO_REQUIRED");
    expect(res.body.message).toMatch(/Personalized Wall Art/);
    expect((await Product.findOne({ id: "wall-art" }).lean()).stock).toBe(50);
  });

  it("refuses a photo uploaded for a different product", async () => {
    await Product.updateOne({ id: "plain-mug" }, { photoUpload: true });
    const mugPhoto = (await uploadPhoto("plain-mug")).body.photo;

    const res = await placeOrder([{ productId: "wall-art", quantity: 1, photoId: mugPhoto.id }]);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("PHOTO_REQUIRED");
  });

  it("names the photo on the order line (no link) and keeps it with the order", async () => {
    const { photo } = (await uploadPhoto("wall-art")).body;

    const res = await placeOrder([
      { productId: "wall-art", quantity: 1, photoId: photo.id, photoUrl: "https://evil.example/x.png" },
      { productId: "plain-mug", quantity: 2 },
    ]);

    expect(res.status).toBe(201);
    const [artLine, mugLine] = res.body.order.lineItems;
    expect(artLine.photo).toEqual({ id: photo.id, name: "family.png" });
    expect(mugLine.photo).toBeUndefined();
    const saved = await CustomerPhoto.findOne({ id: photo.id }).lean();
    expect(saved.orderId).toBe(res.body.order.orderId);
  });
});
