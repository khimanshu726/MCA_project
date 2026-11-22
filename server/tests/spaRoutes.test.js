import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  STOREFRONT_DYNAMIC_PATTERNS,
  STOREFRONT_STATIC_PATHS,
  isKnownStorefrontPath,
  resolveStorefrontStatus,
} from "../utils/spaRoutes.js";
import { createStorefrontStatus } from "../middleware/storefrontStatus.js";
import { createBotPrerender } from "../middleware/botPrerender.js";

const here = path.dirname(fileURLToPath(import.meta.url));

const products = {
  "classic-card": { id: "classic-card", name: "Classic Visiting Card", status: "active", images: [] },
  "draft-poster": { id: "draft-poster", name: "Draft Poster", status: "draft", images: [] },
};
const findProduct = async (id) => products[id] || null;

const weddingSuite = {
  id: "col-1",
  slug: "wedding-invitation-suite",
  name: "Wedding Invitation Suite",
  description: "Every wedding card design",
  coverImage: "https://example.com/cover.jpg",
  status: "active",
  legacyProductIds: ["wedding-suite"],
};
const findCollection = async (slug) => (slug === weddingSuite.slug ? weddingSuite : null);
const findLegacyCollection = async (productId) =>
  weddingSuite.legacyProductIds.includes(productId) ? weddingSuite : null;
const lookups = { findProduct, findCollection, findLegacyCollection };

describe("storefront route list", () => {
  // The server's list must mirror the React routes, or a new page would 404.
  it("covers every <Route path> in src/App.jsx", () => {
    const app = fs.readFileSync(path.resolve(here, "../../src/App.jsx"), "utf8");
    const paths = [...app.matchAll(/<Route[^>]*\spath="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*");

    // Nested checkout steps are declared relative to /checkout.
    const absolute = paths.map((p) => (p.startsWith("/") ? p : `/checkout/${p}`));
    // Express-style ":param" → one concrete segment.
    const samples = absolute.map((p) => p.replace(/:[^/]+/g, "sample-id"));

    for (const sample of samples) {
      expect(isKnownStorefrontPath(sample), `${sample} is a React route but the server would 404 it`).toBe(true);
    }
    expect(STOREFRONT_STATIC_PATHS.length + STOREFRONT_DYNAMIC_PATTERNS.length).toBeGreaterThan(0);
  });
});

describe("resolveStorefrontStatus", () => {
  it.each([
    ["/", 200],
    ["/products", 200],
    ["/products/", 200],
    ["/institutions", 200],
    ["/checkout/review", 200],
    ["/account/orders/EE-20261121-ABCDEF12", 200],
    ["/products/classic-card", 200],
    ["/this-page-does-not-exist", 404],
    ["/products/classic-card/extra", 404],
    ["/products/no-such-product", 404],
    ["/products/draft-poster", 404],
    ["/products/%E0%A4", 404],
  ])("%s → %i", async (pathname, expected) => {
    const { status } = await resolveStorefrontStatus(pathname, { findProduct });
    expect(status).toBe(expected);
  });

  it.each([
    ["/collections/wedding-invitation-suite", 200],
    ["/collections/no-such-collection", 404],
    ["/collections/%E0%A4", 404],
    ["/collections/wedding-invitation-suite/extra", 404],
  ])("%s → %i", async (pathname, expected) => {
    const { status } = await resolveStorefrontStatus(pathname, lookups);
    expect(status).toBe(expected);
  });

  it("sends a retired product's old URL to the collection that replaced it", async () => {
    const result = await resolveStorefrontStatus("/products/wedding-suite", lookups);
    expect(result).toMatchObject({ status: 301, redirect: "/collections/wedding-invitation-suite" });
  });

  it("still 404s a missing product no collection took over", async () => {
    const { status } = await resolveStorefrontStatus("/products/no-such-product", lookups);
    expect(status).toBe(404);
  });

  it("answers 200 when the product lookup fails, so an outage never de-indexes live products", async () => {
    const failing = async () => {
      throw new Error("db down");
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { status } = await resolveStorefrontStatus("/products/classic-card", { findProduct: failing });
    expect(status).toBe(200);
  });
});

describe("storefront HTML responses", () => {
  let distPath;
  let app;

  beforeAll(() => {
    distPath = fs.mkdtempSync(path.join(os.tmpdir(), "spa-dist-"));
    fs.writeFileSync(
      path.join(distPath, "index.html"),
      "<!doctype html><html><head><title>Elite Impressions | Premium Print Shop</title></head><body><div id=\"root\"></div></body></html>",
    );

    // Same order as server/index.js in production.
    app = express();
    app.use(createStorefrontStatus(lookups));
    app.use(createBotPrerender(distPath));
    app.get(/^(?!\/api\/|\/uploads\/|\/admin(?:\/|$)).*/, (req, res) => {
      res.status(res.locals.storefrontStatus ?? 200).sendFile(path.join(distPath, "index.html"));
    });
  });

  afterAll(() => {
    fs.rmSync(distPath, { recursive: true, force: true });
  });

  it("serves the app with 200 for a real page", async () => {
    const res = await request(app).get("/products");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('<div id="root">');
  });

  it("serves the app with 404 for an unknown URL, so it can show its Page not found screen", async () => {
    const res = await request(app).get("/this-page-does-not-exist");
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain('<div id="root">');
  });

  it("redirects a retired product's URL to its collection with a 301", async () => {
    const res = await request(app).get("/products/wedding-suite");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/collections/wedding-invitation-suite");
  });

  it("gives crawlers the collection's own title and canonical", async () => {
    const res = await request(app)
      .get("/collections/wedding-invitation-suite")
      .set("User-Agent", "Mozilla/5.0 (compatible; Googlebot/2.1)");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<title>Wedding Invitation Suite | Elite Impressions</title>");
    expect(res.text).toContain("/collections/wedding-invitation-suite");
    expect(res.text).toContain("https://example.com/cover.jpg");
  });

  it("serves a 404 for a product that doesn't exist", async () => {
    const res = await request(app).get("/products/no-such-product");
    expect(res.statusCode).toBe(404);
  });

  it("gives crawlers a 404 with noindex Page not found metadata for an unknown URL", async () => {
    const res = await request(app).get("/this-page-does-not-exist").set("User-Agent", "Googlebot/2.1");
    expect(res.statusCode).toBe(404);
    expect(res.text).toContain("<title>Page not found | Elite Impressions</title>");
    expect(res.text).toContain('<meta name="robots" content="noindex, follow" />');
  });

  it("still gives crawlers the product's own metadata with 200 for a real product", async () => {
    const res = await request(app).get("/products/classic-card").set("User-Agent", "Googlebot/2.1");
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain("<title>Classic Visiting Card | Elite Impressions</title>");
    expect(res.text).toContain('<meta name="robots" content="index, follow" />');
  });
});
