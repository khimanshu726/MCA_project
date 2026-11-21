import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { Cart } from "../models/Cart.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token === "customer-token") {
      return { uid: "tier-customer-uid", email: "tier@example.com", auth_time: Math.floor(Date.now() / 1000) };
    }
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("volume-pricing-test"));
  await Product.init();
  const admin = await User.create({ id: "tier-admin", name: "Admin", email: "tier-admin@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

afterEach(async () => {
  await Product.deleteMany({});
  await Order.deleteMany({});
  await Cart.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const TIERS = [
  { minQty: 250, price: 16 },
  { minQty: 500, price: 14 },
];

const seedCard = (overrides = {}) =>
  Product.create({
    id: "tier-card",
    name: "Tier Card",
    description: "Cards with volume pricing",
    category: "Visiting Cards",
    images: ["https://example.com/card.jpg"],
    price: 18,
    mrp: 20,
    stock: 5000,
    minimumOrderQty: 100,
    status: "active",
    priceTiers: TIERS,
    ...overrides,
  });

const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);
const asCustomer = (req) => req.set("Authorization", "Bearer customer-token");

const placeOrder = (lineItems) =>
  request(app)
    .post("/api/orders")
    .field({
      customerName: "Tier Buyer",
      phone: "9876543210",
      email: "tier-buyer@example.com",
      streetAddress: "1 Test St",
      city: "Purnia",
      state: "Bihar",
      pincode: "854301",
      paymentMethod: "cod",
    })
    .field("lineItems", JSON.stringify(lineItems));

describe("price tiers on the product", () => {
  it("stores tiers sorted by quantity and returns them from the product API", async () => {
    await seedCard({ priceTiers: [...TIERS].reverse() });

    const res = await request(app).get("/api/products/tier-card").expect(200);
    expect(res.body.product.priceTiers).toEqual(TIERS);
  });

  it("rejects a tier priced at or above the base price", async () => {
    await expect(seedCard({ priceTiers: [{ minQty: 250, price: 18 }] })).rejects.toThrow(/lower than the base price/);
  });

  it("rejects a later base-price edit that leaves a tier above it", async () => {
    await seedCard();

    const res = await asAdmin(request(app).put("/api/admin/products/tier-card")).send({ price: 15, mrp: 20 });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.priceTiers).toMatch(/lower than the base price/);
    expect((await Product.findOne({ id: "tier-card" })).price).toBe(18);
  });

  it("lets an admin create and update tiers, with validation errors per field", async () => {
    const created = await asAdmin(request(app).post("/api/admin/products")).send({
      name: "Admin Tier Card",
      description: "d",
      category: "Visiting Cards",
      images: ["https://example.com/card.jpg"],
      price: 18,
      mrp: 20,
      stock: 1000,
      minimumOrderQty: 100,
      status: "active",
      priceTiers: TIERS,
    });
    expect(created.statusCode).toBe(201);
    expect(created.body.product.priceTiers).toEqual(TIERS);

    const bad = await asAdmin(request(app).put(`/api/admin/products/${created.body.product.id}`)).send({
      priceTiers: [
        { minQty: 250, price: 15 },
        { minQty: 500, price: 16 },
      ],
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.body.errors.priceTiers).toMatch(/can't cost more per unit/);

    const cleared = await asAdmin(request(app).put(`/api/admin/products/${created.body.product.id}`)).send({ priceTiers: [] });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.body.product.priceTiers).toEqual([]);
  });
});

describe("orders are charged the tier price for their quantity", () => {
  it.each([
    [100, 18],
    [249, 18],
    [250, 16],
    [500, 14],
  ])("%i units at ₹%i each", async (quantity, unitPrice) => {
    await seedCard();

    const res = await placeOrder([{ productId: "tier-card", quantity }]);

    expect(res.statusCode).toBe(201);
    const [line] = res.body.order.lineItems;
    expect(line.unitPrice).toBe(unitPrice);
    expect(line.totalPrice).toBe(unitPrice * quantity);
    expect(res.body.order.subtotal).toBe(unitPrice * quantity);
  });

  it("ignores a price sent by the client", async () => {
    await seedCard();

    const res = await placeOrder([{ productId: "tier-card", quantity: 250, price: 1, unitPrice: 1 }]);

    expect(res.body.order.lineItems[0].unitPrice).toBe(16);
  });
});

describe("checkout preview and server cart use the tier price", () => {
  it("prices the checkout preview at the tier for the quantity", async () => {
    await seedCard();

    const res = await request(app)
      .post("/api/checkout/preview")
      .send({ lineItems: [{ productId: "tier-card", quantity: 500 }] })
      .expect(200);

    expect(res.body.pricing.subtotal).toBe(14 * 500);
  });

  it("charges the tier price in a signed-in cart, and drops back below the break", async () => {
    await seedCard();

    await asCustomer(request(app).post("/api/cart/items")).send({ productId: "tier-card", quantity: 250 }).expect(201);
    let cart = (await asCustomer(request(app).get("/api/cart")).expect(200)).body;
    expect(cart.items[0].unitPrice).toBe(16);
    expect(cart.items[0].lineTotal).toBe(16 * 250);
    expect(cart.pricing.subtotal).toBe(16 * 250);
    // Crossing a tier is not a "price changed since you added it".
    expect(cart.items[0].isPriceChanged).toBe(false);

    await asCustomer(request(app).patch("/api/cart/items/tier-card")).send({ quantity: 200 }).expect(200);
    cart = (await asCustomer(request(app).get("/api/cart")).expect(200)).body;
    expect(cart.items[0].unitPrice).toBe(18);
    expect(cart.pricing.subtotal).toBe(18 * 200);
  });
});
