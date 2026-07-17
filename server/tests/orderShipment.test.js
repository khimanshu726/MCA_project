import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";

/**
 * Recording who has the parcel.
 *
 * `trackingId` has been on the Order and accepted by this endpoint since it was
 * written, and no UI ever rendered a field to type it into — so no order could
 * have one. `courier` is what makes the number usable: without knowing whose
 * number it is, it can't become a link.
 *
 * The validation here exists so bad data can't reach a customer's order page as
 * a blank courier or "Arrives by Invalid Date".
 */
vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async () => {
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;
let adminToken;

const seedOrder = () => {
  const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
  return Order.create({
    id: `id-${ref}`,
    orderId: `ORD-${ref}`,
    customerName: "Buyer",
    phone: "9876543210",
    email: "buyer@example.com",
    address: { street: "1 Test St", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    paymentMethod: "cod",
    quantity: 1,
    price: 100,
    orderStatus: "Shipped",
  });
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("order-shipment-test"));
  const admin = await User.create({ id: "ship-admin", name: "Admin", email: "shipadmin@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

afterEach(async () => {
  await Order.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const patch = (id, body) =>
  request(app).put(`/api/admin/orders/${id}`).set("Authorization", `Bearer ${adminToken}`).send(body);

describe("PUT /api/admin/orders/:id — shipment", () => {
  it("records the courier, tracking number, and expected delivery", async () => {
    const order = await seedOrder();

    const res = await patch(order.id, {
      courier: "delhivery",
      trackingId: "  1234567890  ",
      expectedDeliveryDate: "2026-07-25",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.courier).toBe("delhivery");
    expect(res.body.order.trackingId).toBe("1234567890"); // trimmed
    expect(new Date(res.body.order.expectedDeliveryDate).toISOString()).toContain("2026-07-25");
  });

  it("rejects a courier that isn't in the registry", async () => {
    const order = await seedOrder();

    const res = await patch(order.id, { courier: "definitely-not-a-courier" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Invalid courier/);
    expect((await Order.findOne({ id: order.id })).courier).toBe("");
  });

  it("rejects an unparseable delivery date rather than storing Invalid Date", async () => {
    const order = await seedOrder();

    const res = await patch(order.id, { expectedDeliveryDate: "next tuesday-ish" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Invalid expected delivery date/);
  });

  it("lets an empty courier clear the field — a parcel can be recalled from a courier", async () => {
    const order = await seedOrder();
    await patch(order.id, { courier: "dtdc" });

    const res = await patch(order.id, { courier: "" });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.courier).toBe("");
  });

  it("lets null clear the expected delivery date", async () => {
    const order = await seedOrder();
    await patch(order.id, { expectedDeliveryDate: "2026-07-25" });

    const res = await patch(order.id, { expectedDeliveryDate: null });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.expectedDeliveryDate).toBeNull();
  });

  it("leaves shipment fields alone when the request doesn't mention them", async () => {
    const order = await seedOrder();
    await patch(order.id, { courier: "bluedart", trackingId: "BD1", expectedDeliveryDate: "2026-07-25" });

    // A plain status change must not wipe the shipment.
    const res = await patch(order.id, { orderStatus: "Delivered" });

    expect(res.statusCode).toBe(200);
    expect(res.body.order.courier).toBe("bluedart");
    expect(res.body.order.trackingId).toBe("BD1");
    expect(res.body.order.expectedDeliveryDate).toBeTruthy();
  });

  it("blocks non-admins from touching shipment details", async () => {
    const order = await seedOrder();
    const user = await User.create({ id: "ship-user", name: "U", email: "u@ee.com", role: "user" });
    const userToken = jwt.sign({ sub: user.id }, appConfig.jwtSecret);

    const res = await request(app)
      .put(`/api/admin/orders/${order.id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ courier: "delhivery" });

    expect(res.statusCode).toBe(403);
  });
});
