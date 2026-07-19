import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Design } from "../models/Design.js";
import { User } from "../models/User.js";

vi.mock("../config/firebaseAdmin.js", () => ({
  verifyFirebaseIdToken: vi.fn(async (token) => {
    if (token === "valid-token") {
      return { uid: "designs-firebase-uid", email: "designs-tester@example.com", auth_time: Math.floor(Date.now() / 1000) };
    }
    if (token === "other-token") {
      return { uid: "other-firebase-uid", email: "other-tester@example.com", auth_time: Math.floor(Date.now() / 1000) };
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
  await mongoose.connect(mongoServer.getUri("designs-test"));
});

afterEach(async () => {
  await Design.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const authHeader = { Authorization: "Bearer valid-token" };
const otherAuthHeader = { Authorization: "Bearer other-token" };

const sampleState = (overrides = {}) => ({
  version: 1,
  templateId: "visiting-cards",
  options: { finish: "matte" },
  sides: {
    front: {
      background: { type: "color", value: "#ffffff" },
      layers: [
        {
          id: "layer-1",
          type: "text",
          text: "Elite Empressions",
          x: 10,
          y: 10,
          width: 60,
          height: 12,
          rotation: 0,
        },
      ],
    },
  },
  ...overrides,
});

const createDesignPayload = (overrides = {}) => ({
  productId: "classic-card",
  productName: "Classic Visiting Card",
  templateId: "visiting-cards",
  name: "My first card",
  state: sampleState(),
  previewImage: "data:image/jpeg;base64,abc123",
  ...overrides,
});

describe("Designs API", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/designs");
    expect(response.status).toBe(401);
  });

  it("creates a design and returns the full document", async () => {
    const response = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTruthy();
    expect(response.body.name).toBe("My first card");
    expect(response.body.state.sides.front.layers).toHaveLength(1);
    expect(response.body.previewImage).toContain("data:image/jpeg");
  });

  it("rejects a design without a name or state", async () => {
    const noName = await request(app)
      .post("/api/designs")
      .set(authHeader)
      .send(createDesignPayload({ name: "" }));
    expect(noName.status).toBe(400);

    const noState = await request(app)
      .post("/api/designs")
      .set(authHeader)
      .send(createDesignPayload({ state: null }));
    expect(noState.status).toBe(400);
  });

  it("lists only the customer's designs as summaries (no state)", async () => {
    await request(app).post("/api/designs").set(authHeader).send(createDesignPayload({ name: "Mine" }));
    await request(app).post("/api/designs").set(otherAuthHeader).send(createDesignPayload({ name: "Not mine" }));

    const response = await request(app).get("/api/designs").set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].name).toBe("Mine");
    expect(response.body.items[0].state).toBeUndefined();
  });

  it("fetches a full design by id with ownership enforced", async () => {
    const created = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());
    const designId = created.body.id;

    const owned = await request(app).get(`/api/designs/${designId}`).set(authHeader);
    expect(owned.status).toBe(200);
    expect(owned.body.state.version).toBe(1);

    const foreign = await request(app).get(`/api/designs/${designId}`).set(otherAuthHeader);
    expect(foreign.status).toBe(404);
  });

  it("updates name and state", async () => {
    const created = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());

    const response = await request(app)
      .put(`/api/designs/${created.body.id}`)
      .set(authHeader)
      .send({ name: "Renamed", state: sampleState({ options: { finish: "gloss" } }) });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Renamed");
    expect(response.body.state.options.finish).toBe("gloss");
  });

  it("duplicates a design with a (copy) suffix", async () => {
    const created = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());

    const response = await request(app).post(`/api/designs/${created.body.id}/duplicate`).set(authHeader);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("My first card (copy)");
    expect(response.body.id).not.toBe(created.body.id);

    const list = await request(app).get("/api/designs").set(authHeader);
    expect(list.body.items).toHaveLength(2);
  });

  it("deletes a design and 404s on repeat delete", async () => {
    const created = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());

    const first = await request(app).delete(`/api/designs/${created.body.id}`).set(authHeader);
    expect(first.status).toBe(204);

    const second = await request(app).delete(`/api/designs/${created.body.id}`).set(authHeader);
    expect(second.status).toBe(404);
  });

  it("404s (not 500) for a malformed design id", async () => {
    const response = await request(app).get("/api/designs/not-an-object-id").set(authHeader);
    expect(response.status).toBe(404);
  });

  it("rejects an oversized state payload with 400", async () => {
    const bigState = sampleState({ blob: "x".repeat(1.6 * 1024 * 1024) });

    const response = await request(app)
      .post("/api/designs")
      .set(authHeader)
      .send(createDesignPayload({ state: bigState }));

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/too large/i);
  });

  it("enforces the per-customer design cap on create", async () => {
    const { MAX_DESIGNS_PER_CUSTOMER } = await import("../services/designStore.js");

    // Insert directly (faster than 50 HTTP calls) for the same customer id
    // the auth mock upserts. Fetch that id from a real created design.
    const seeded = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());
    const customerId = (await Design.findById(seeded.body.id)).customerId;

    const fillers = Array.from({ length: MAX_DESIGNS_PER_CUSTOMER - 1 }, (_, index) => ({
      customerId,
      productId: "classic-card",
      name: `Filler ${index}`,
      state: { version: 1 },
    }));
    await Design.insertMany(fillers);

    const response = await request(app).post("/api/designs").set(authHeader).send(createDesignPayload());

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/up to/i);
  });

  it("uploads a design asset and returns a usable URL", async () => {
    const response = await request(app)
      .post("/api/designs/assets")
      .set(authHeader)
      .attach("asset", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
        filename: "logo.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(201);
    expect(response.body.url).toMatch(/\/uploads\/design-/);
  });

  it("rejects non-image asset uploads", async () => {
    const response = await request(app)
      .post("/api/designs/assets")
      .set(authHeader)
      .attach("asset", Buffer.from("%PDF-1.4"), {
        filename: "file.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
