import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { Product } from "../models/Product.js";

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("sitemap-test"));
});

afterEach(async () => {
  await Product.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Each product needs its own name: the slug is derived from the name and has a
// unique index. With a shared name, two seeds collided on slug "test-product"
// whenever MongoDB had finished building that index (it builds in the
// background after connect), which made this test fail intermittently in CI.
const seedProduct = (overrides = {}) =>
  Product.create({
    id: overrides.id || "prod-1",
    name: `Test Product ${overrides.id || "prod-1"}`,
    description: "desc",
    category: "Visiting Cards",
    images: ["https://example.com/i.jpg"],
    price: 100,
    mrp: 120,
    stock: 10,
    status: "active",
    ...overrides,
  });

describe("GET /sitemap.xml", () => {
  it("serves an XML sitemap with the canonical www origin and static routes", async () => {
    const res = await request(app).get("/sitemap.xml").expect(200);

    expect(res.headers["content-type"]).toMatch(/xml/);
    expect(res.text).toContain("<urlset");
    expect(res.text).toContain("https://eliteimpressions.co.in/</loc>");
    expect(res.text).toContain("https://eliteimpressions.co.in/products</loc>");
    expect(res.text).toContain("https://eliteimpressions.co.in/institutions</loc>");
    for (const page of ["about", "contact", "faq", "privacy", "terms"]) {
      expect(res.text).toContain(`https://eliteimpressions.co.in/${page}</loc>`);
    }
  });

  it("includes a URL for each active product but excludes drafts", async () => {
    await seedProduct({ id: "live-card", status: "active" });
    await seedProduct({ id: "hidden-card", status: "draft" });

    const res = await request(app).get("/sitemap.xml").expect(200);

    expect(res.text).toContain("https://eliteimpressions.co.in/products/live-card</loc>");
    expect(res.text).not.toContain("hidden-card");
  });
});
