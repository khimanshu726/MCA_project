import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Address } from "../models/Address.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token === "valid-token") {
      return { uid: "test-firebase-uid", email: "address-tester@example.com" };
    }
    if (token === "other-token") {
      return { uid: "other-firebase-uid", email: "other-tester@example.com" };
    }
    const error = new Error("Invalid token");
    error.statusCode = 401;
    throw error;
  }),
  isFirebaseAdminConfigured: () => true,
}));

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("address-test"));
});

afterEach(async () => {
  await Address.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const authHeader = { Authorization: "Bearer valid-token" };
const otherAuthHeader = { Authorization: "Bearer other-token" };

const validPayload = (overrides = {}) => ({
  fullName: "Aarav Sharma",
  phoneNumber: "9876543210",
  pincode: "400001",
  addressLine1: "221 Business Street, Andheri East",
  landmark: "Near Metro Station Gate 2",
  city: "Mumbai",
  district: "Mumbai",
  state: "Maharashtra",
  addressType: "home",
  ...overrides,
});

describe("Address API", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/addresses");
    expect(res.statusCode).toBe(401);
  });

  it("returns an empty list for a new user", async () => {
    const res = await request(app).get("/api/addresses").set(authHeader);

    expect(res.statusCode).toBe(200);
    expect(res.body.addresses).toEqual([]);
  });

  it("rejects a payload missing required fields", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .set(authHeader)
      .send(validPayload({ fullName: "" }));

    expect(res.statusCode).toBe(400);
  });

  it("rejects a non-6-digit pincode", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .set(authHeader)
      .send(validPayload({ pincode: "abc" }));

    expect(res.statusCode).toBe(400);
  });

  it("creates an address and makes the first one default automatically", async () => {
    const res = await request(app).post("/api/addresses").set(authHeader).send(validPayload());

    expect(res.statusCode).toBe(201);
    expect(res.body.address.isDefault).toBe(true);
    expect(res.body.address.fullName).toBe("Aarav Sharma");
  });

  it("keeps a second address non-default unless explicitly set", async () => {
    await request(app).post("/api/addresses").set(authHeader).send(validPayload());
    const res = await request(app)
      .post("/api/addresses")
      .set(authHeader)
      .send(validPayload({ fullName: "Riya Mehta" }));

    expect(res.body.address.isDefault).toBe(false);

    const list = await request(app).get("/api/addresses").set(authHeader);
    expect(list.body.addresses).toHaveLength(2);
    expect(list.body.addresses.filter((address) => address.isDefault)).toHaveLength(1);
  });

  it("unsets the previous default when a new address is created as default", async () => {
    const first = await request(app).post("/api/addresses").set(authHeader).send(validPayload());
    await request(app)
      .post("/api/addresses")
      .set(authHeader)
      .send(validPayload({ fullName: "Riya Mehta", isDefault: true }));

    const list = await request(app).get("/api/addresses").set(authHeader);
    const defaults = list.body.addresses.filter((address) => address.isDefault);

    expect(defaults).toHaveLength(1);
    expect(defaults[0].fullName).toBe("Riya Mehta");
    expect(list.body.addresses.find((address) => address._id === first.body.address._id).isDefault).toBe(false);
  });

  it("updates an address", async () => {
    const created = await request(app).post("/api/addresses").set(authHeader).send(validPayload());

    const res = await request(app)
      .put(`/api/addresses/${created.body.address._id}`)
      .set(authHeader)
      .send(validPayload({ fullName: "Aarav Updated" }));

    expect(res.statusCode).toBe(200);
    expect(res.body.address.fullName).toBe("Aarav Updated");
  });

  it("404s updating an address owned by another customer", async () => {
    const created = await request(app).post("/api/addresses").set(authHeader).send(validPayload());

    const res = await request(app)
      .put(`/api/addresses/${created.body.address._id}`)
      .set(otherAuthHeader)
      .send(validPayload({ fullName: "Hijacked" }));

    expect(res.statusCode).toBe(404);
  });

  it("deletes an address and promotes another to default", async () => {
    const first = await request(app).post("/api/addresses").set(authHeader).send(validPayload());
    const second = await request(app)
      .post("/api/addresses")
      .set(authHeader)
      .send(validPayload({ fullName: "Riya Mehta" }));

    const res = await request(app).delete(`/api/addresses/${first.body.address._id}`).set(authHeader);
    expect(res.statusCode).toBe(200);

    const list = await request(app).get("/api/addresses").set(authHeader);
    expect(list.body.addresses).toHaveLength(1);
    expect(list.body.addresses[0]._id).toBe(second.body.address._id);
    expect(list.body.addresses[0].isDefault).toBe(true);
  });

  it("404s deleting an address owned by another customer", async () => {
    const created = await request(app).post("/api/addresses").set(authHeader).send(validPayload());

    const res = await request(app).delete(`/api/addresses/${created.body.address._id}`).set(otherAuthHeader);
    expect(res.statusCode).toBe(404);
  });

  it("switches the default via the dedicated endpoint", async () => {
    await request(app).post("/api/addresses").set(authHeader).send(validPayload());
    const second = await request(app)
      .post("/api/addresses")
      .set(authHeader)
      .send(validPayload({ fullName: "Riya Mehta" }));

    const res = await request(app).patch(`/api/addresses/${second.body.address._id}/default`).set(authHeader);
    expect(res.statusCode).toBe(200);
    expect(res.body.address.isDefault).toBe(true);

    const list = await request(app).get("/api/addresses").set(authHeader);
    expect(list.body.addresses.filter((address) => address.isDefault)).toHaveLength(1);
    expect(list.body.addresses.find((address) => address._id === second.body.address._id).isDefault).toBe(true);
  });
});
