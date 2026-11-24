import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { CustomerPhoto } from "../models/CustomerPhoto.js";

/**
 * A personalised product (photoUpload) takes the customer's photo: uploaded
 * first, then named by the order line. Runs on the local-disk driver.
 */
const uploadsDir = path.resolve(process.cwd(), "uploads");
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const envSnapshot = {};
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("customer-photos-test"));
  mkdirSync(uploadsDir, { recursive: true });
});

beforeEach(async () => {
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
  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await Promise.all([Product.deleteMany({}), Order.deleteMany({}), CustomerPhoto.deleteMany({})]);
  for (const name of readdirSync(uploadsDir)) {
    if (name.startsWith("photo-")) unlinkSync(path.join(uploadsDir, name));
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

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

const storedPhotoFiles = () => readdirSync(uploadsDir).filter((name) => name.startsWith("photo-"));

describe("uploading a customer photo", () => {
  it("stores the photo for a personalised product and returns its id and URL", async () => {
    const res = await uploadPhoto("wall-art");

    expect(res.status).toBe(201);
    expect(res.body.photo).toMatchObject({ name: "family.png" });
    expect(res.body.photo.url).toMatch(/^\/uploads\/photo-/);
    const saved = await CustomerPhoto.findOne({ id: res.body.photo.id }).lean();
    expect(saved).toMatchObject({ productId: "wall-art", orderId: "", url: res.body.photo.url });
    expect(storedPhotoFiles()).toHaveLength(1);
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

  it("puts the photo on the order line, from our own record, and keeps it with the order", async () => {
    const { photo } = (await uploadPhoto("wall-art")).body;

    const res = await placeOrder([
      { productId: "wall-art", quantity: 1, photoId: photo.id, photoUrl: "https://evil.example/x.png" },
      { productId: "plain-mug", quantity: 2 },
    ]);

    expect(res.status).toBe(201);
    const [artLine, mugLine] = res.body.order.lineItems;
    expect(artLine.photo).toEqual({ id: photo.id, url: photo.url });
    expect(mugLine.photo).toBeUndefined();
    const saved = await CustomerPhoto.findOne({ id: photo.id }).lean();
    expect(saved.orderId).toBe(res.body.order.orderId);
  });
});
