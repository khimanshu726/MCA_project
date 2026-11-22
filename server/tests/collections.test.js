import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { app } from "../index.js";
import { appConfig } from "../config.js";
import { Collection } from "../models/Collection.js";
import { Product } from "../models/Product.js";
import { User } from "../models/User.js";

let mongoServer;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri("collections-test"));
  await Promise.all([Collection.init(), Product.init()]);
  const admin = await User.create({ id: "col-admin", name: "Admin", email: "col-admin@ee.com", role: "admin" });
  adminToken = jwt.sign({ sub: admin.id }, appConfig.jwtSecret);
});

afterEach(async () => {
  await Collection.deleteMany({});
  await Product.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
  await mongoServer.stop();
});

const asAdmin = (req) => req.set("Authorization", `Bearer ${adminToken}`);

let productSeq = 0;
const seedDesign = (overrides = {}) => {
  productSeq += 1;
  return Product.create({
    id: `design-${productSeq}`,
    name: `Design ${productSeq}`,
    slug: `design-${productSeq}`,
    description: "A wedding card",
    category: "Wedding Cards",
    images: ["https://example.com/i.jpg"],
    price: 90,
    mrp: 90,
    stock: 1000,
    minimumOrderQty: 50,
    status: "active",
    ...overrides,
  });
};

const createCollection = async (body = {}) => {
  const response = await asAdmin(request(app).post("/api/admin/collections")).send({
    name: "Wedding Invitation Suite",
    category: "Invitations",
    status: "active",
    ...body,
  });
  expect(response.status).toBe(201);
  return response.body.collection;
};

const validProductBody = (overrides = {}) => ({
  name: "Royal Rose",
  description: "Gold foil wedding card",
  category: "Wedding Cards",
  images: ["https://example.com/royal.jpg"],
  price: 120,
  mrp: 150,
  stock: 500,
  minimumOrderQty: 50,
  status: "active",
  ...overrides,
});

describe("admin collections", () => {
  it("creates a collection with a slug from its name and keeps that slug on rename", async () => {
    const created = await createCollection({ legacyProductIds: ["wedding-suite", " wedding-suite ", ""] });
    expect(created.slug).toBe("wedding-invitation-suite");
    expect(created.id).toEqual(expect.any(String));
    expect(created.legacyProductIds).toEqual(["wedding-suite"]);

    const renamed = await asAdmin(request(app).put(`/api/admin/collections/${created.id}`)).send({
      name: "Wedding Cards Collection",
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.collection.name).toBe("Wedding Cards Collection");
    expect(renamed.body.collection.slug).toBe("wedding-invitation-suite");
  });

  it("rejects a second collection with the same name", async () => {
    await createCollection();
    const response = await asAdmin(request(app).post("/api/admin/collections")).send({
      name: "Wedding Invitation Suite",
      category: "Invitations",
    });
    expect(response.status).toBe(400);
    expect(response.body.errors.name).toMatch(/already exists/);
  });

  it("lists collections with their design count (drafts included) and lowest price", async () => {
    const collection = await createCollection();
    await seedDesign({ collectionId: collection.id, price: 120, mrp: 120 });
    await seedDesign({ collectionId: collection.id, price: 80, mrp: 80, status: "draft" });

    const response = await asAdmin(request(app).get("/api/admin/collections"));
    expect(response.status).toBe(200);
    expect(response.body.collections[0]).toMatchObject({ productCount: 2, minPrice: 80 });
  });

  it("won't delete a collection that still has designs in it", async () => {
    const collection = await createCollection();
    await seedDesign({ collectionId: collection.id });

    const blocked = await asAdmin(request(app).delete(`/api/admin/collections/${collection.id}`));
    expect(blocked.status).toBe(409);

    await Product.deleteMany({});
    const deleted = await asAdmin(request(app).delete(`/api/admin/collections/${collection.id}`));
    expect(deleted.status).toBe(200);
    expect(await Collection.countDocuments()).toBe(0);
  });

  it("needs an admin", async () => {
    const response = await request(app).get("/api/admin/collections");
    expect(response.status).toBe(401);
  });
});

describe("products in a collection", () => {
  it("saves a product's collection and design type", async () => {
    const collection = await createCollection();
    const response = await asAdmin(request(app).post("/api/admin/products")).send(
      validProductBody({ collectionId: collection.id, designType: " Royal " }),
    );
    expect(response.status).toBe(201);
    expect(response.body.product).toMatchObject({ collectionId: collection.id, designType: "Royal" });
  });

  it("refuses a collection that doesn't exist", async () => {
    const response = await asAdmin(request(app).post("/api/admin/products")).send(
      validProductBody({ collectionId: "no-such-collection" }),
    );
    expect(response.status).toBe(400);
    expect(response.body.errors.collectionId).toBeTruthy();
  });

  it("gives repeated copies their own slug instead of failing", async () => {
    const body = validProductBody({ name: "Royal Rose (copy)", status: "draft" });
    const first = await asAdmin(request(app).post("/api/admin/products")).send(body);
    const second = await asAdmin(request(app).post("/api/admin/products")).send(body);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.product.slug).toBe("royal-rose-copy");
    expect(second.body.product.slug).toBe("royal-rose-copy-2");
  });

  it("filters the admin list by collection", async () => {
    const collection = await createCollection();
    await seedDesign({ collectionId: collection.id });
    await seedDesign();

    const response = await asAdmin(request(app).get(`/api/admin/products?collection=${collection.id}`));
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].collectionId).toBe(collection.id);
  });
});

describe("storefront collections", () => {
  it("lists active collections that have something to buy, with count and lowest price", async () => {
    const live = await createCollection();
    await seedDesign({ collectionId: live.id, price: 120, mrp: 120 });
    await seedDesign({ collectionId: live.id, price: 95, mrp: 95 });
    // Drafts don't count toward what customers see.
    await seedDesign({ collectionId: live.id, price: 10, mrp: 10, status: "draft" });

    const draft = await createCollection({ name: "Draft Collection", status: "draft" });
    await seedDesign({ collectionId: draft.id });
    await createCollection({ name: "Empty Collection" });

    const response = await request(app).get("/api/collections");
    expect(response.status).toBe(200);
    expect(response.body.collections).toHaveLength(1);
    expect(response.body.collections[0]).toMatchObject({ slug: "wedding-invitation-suite", productCount: 2, minPrice: 95 });
  });

  it("filters the list by category", async () => {
    const live = await createCollection();
    await seedDesign({ collectionId: live.id });

    expect((await request(app).get("/api/collections?category=Invitations")).body.collections).toHaveLength(1);
    expect((await request(app).get("/api/collections?category=Banners")).body.collections).toHaveLength(0);
  });

  it("returns an active collection by slug and hides a draft one", async () => {
    const live = await createCollection();
    await seedDesign({ collectionId: live.id });
    await createCollection({ name: "Secret Suite", status: "draft" });

    const found = await request(app).get("/api/collections/wedding-invitation-suite");
    expect(found.status).toBe(200);
    expect(found.body.collection).toMatchObject({ name: "Wedding Invitation Suite", productCount: 1 });

    expect((await request(app).get("/api/collections/secret-suite")).status).toBe(404);
    expect((await request(app).get("/api/collections/nope")).status).toBe(404);
  });

  it("lists a collection's designs, and keeps them out of the main catalogue unless searched", async () => {
    const collection = await createCollection();
    await seedDesign({ collectionId: collection.id, name: "Royal Rose", designType: "Royal" });
    await seedDesign({ collectionId: collection.id, name: "Floral Bloom", designType: "Floral" });
    await seedDesign({ name: "Plain Flyer", category: "Marketing Materials" });

    const inCollection = await request(app).get(`/api/products?collection=${collection.id}`);
    expect(inCollection.body.items.map((item) => item.name).sort()).toEqual(["Floral Bloom", "Royal Rose"]);

    const catalogue = await request(app).get("/api/products?excludeCollected=true");
    expect(catalogue.body.items.map((item) => item.name)).toEqual(["Plain Flyer"]);

    const search = await request(app).get("/api/products?excludeCollected=true&q=royal");
    expect(search.body.items.map((item) => item.name)).toEqual(["Royal Rose"]);

    // The design type is searchable too.
    const byType = await request(app).get("/api/products?q=floral");
    expect(byType.body.items.map((item) => item.name)).toEqual(["Floral Bloom"]);
  });
});

describe("storefront collection links", () => {
  it("lists a collection under its designs' category too, so hiding the designs never empties a category", async () => {
    const collection = await createCollection({ category: "Invitations" });
    await seedDesign({ collectionId: collection.id, category: "Wedding Cards" });

    const byDesigns = await request(app).get("/api/collections?category=Wedding%20Cards");
    expect(byDesigns.body.collections.map((c) => c.slug)).toEqual(["wedding-invitation-suite"]);
    const byOwn = await request(app).get("/api/collections?category=Invitations");
    expect(byOwn.body.collections).toHaveLength(1);
  });

  it("tells a design's page which live collection it belongs to", async () => {
    const collection = await createCollection();
    const design = await seedDesign({ collectionId: collection.id, designType: "Royal" });

    const live = await request(app).get(`/api/products/${design.id}`);
    expect(live.body.product.collection).toEqual({
      id: collection.id,
      name: "Wedding Invitation Suite",
      slug: "wedding-invitation-suite",
    });

    await Collection.updateOne({ id: collection.id }, { status: "draft" });
    const drafted = await request(app).get(`/api/products/${design.id}`);
    expect(drafted.body.product.collection).toBeUndefined();
  });

  it("puts active collections in the sitemap", async () => {
    const collection = await createCollection();
    await seedDesign({ collectionId: collection.id });
    await createCollection({ name: "Hidden Suite", status: "draft" });

    const res = await request(app).get("/sitemap.xml");
    expect(res.text).toContain("/collections/wedding-invitation-suite</loc>");
    expect(res.text).not.toContain("/collections/hidden-suite");
  });
});

describe("making a product into a collection", () => {
  const make = (productId) => asAdmin(request(app).post(`/api/admin/products/${productId}/make-collection`));

  it("creates a collection from the product and keeps the product inside, still on sale", async () => {
    const product = await seedDesign({
      id: "wedding-suite",
      name: "Wedding Invitation Suite",
      description: "Invitation, RSVP and detail cards",
      category: "Invitations",
      images: ["https://example.com/suite-1.jpg", "https://example.com/suite-2.jpg"],
    });

    const response = await make(product.id);
    expect(response.status).toBe(201);
    expect(response.body.collection).toMatchObject({
      name: "Wedding Invitation Suite",
      slug: "wedding-invitation-suite",
      description: "Invitation, RSVP and detail cards",
      category: "Invitations",
      coverImage: "https://example.com/suite-1.jpg",
      status: "active",
      productCount: 1,
    });
    expect(response.body.product).toMatchObject({ id: "wedding-suite", status: "active" });
    expect(response.body.product.collectionId).toBe(response.body.collection.id);

    // On the shop: a live collection with one design, shown instead of the product.
    const live = await request(app).get("/api/collections/wedding-invitation-suite");
    expect(live.body.collection.productCount).toBe(1);
    const catalogue = await request(app).get("/api/products?excludeCollected=true");
    expect(catalogue.body.items.map((item) => item.id)).not.toContain("wedding-suite");
    // Its own page still works.
    expect((await request(app).get("/api/products/wedding-suite")).status).toBe(200);
  });

  it("makes a draft collection from a draft product", async () => {
    const product = await seedDesign({ name: "Draft Thing", status: "draft" });
    const response = await make(product.id);
    expect(response.status).toBe(201);
    expect(response.body.collection.status).toBe("draft");
  });

  it("refuses a product that's already in a collection, without creating another", async () => {
    const collection = await createCollection();
    const product = await seedDesign({ collectionId: collection.id });

    const response = await make(product.id);
    expect(response.status).toBe(409);
    expect(await Collection.countDocuments()).toBe(1);
  });

  it("refuses when a collection with that name already exists, and changes nothing", async () => {
    await createCollection({ name: "Classic Visiting Card" });
    const product = await seedDesign({ name: "classic visiting card" });

    const response = await make(product.id);
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/);
    expect(await Collection.countDocuments()).toBe(1);
    expect((await Product.findOne({ id: product.id })).collectionId).toBe("");
  });

  it("404s an unknown product, and needs an admin", async () => {
    expect((await make("no-such-product")).status).toBe(404);
    const product = await seedDesign();
    expect((await request(app).post(`/api/admin/products/${product.id}/make-collection`)).status).toBe(401);
  });
});
