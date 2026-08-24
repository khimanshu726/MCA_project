import { describe, it, expect } from "vitest";
import { resolveRouteMeta, injectMeta } from "../services/seoMeta.js";

const APEX = "https://eliteimpressions.co.in";
const TEMPLATE = `<!doctype html><html><head><title>Elite Impressions | Premium Print Shop</title></head><body><div id="root"></div></body></html>`;

describe("resolveRouteMeta", () => {
  it("home: LocalBusiness schema with real NAP + apex canonical", () => {
    const meta = resolveRouteMeta("/", null, null);
    expect(meta.title).toMatch(/Custom Printing & Personalized Products in Purnia/);
    expect(meta.canonical).toBe(`${APEX}/`);
    const ld = meta.jsonLd[0];
    expect(ld["@type"]).toBe("Store");
    // Links the "Bihar Press" Google Business Profile to the Elite Impressions site.
    expect(ld.name).toBe("Elite Impressions");
    expect(ld.legalName).toBe("Bihar Press");
    expect(ld.alternateName).toBe("Bihar Press");
    expect(ld.telephone).toBe("+919288675153");
    expect(ld.address.addressLocality).toBe("Purnia");
    expect(ld.address.postalCode).toBe("854301");
  });

  it("products with a category: category-aware title + self canonical", () => {
    const meta = resolveRouteMeta("/products", "Visiting Cards", null);
    expect(meta.title).toBe("Visiting Cards | Elite Impressions");
    expect(meta.canonical).toBe(`${APEX}/products?category=Visiting%20Cards`);
  });

  it("product page: product title/description/canonical + Product schema", () => {
    const product = {
      id: "classic-card",
      name: "Classic Visiting Card",
      description: "350 gsm premium stock.",
      images: ["https://img/1.jpg"],
      price: 18,
      stock: 500,
      minimumOrderQty: 100,
      category: "Visiting Cards",
      sku: "CC-1",
    };
    const meta = resolveRouteMeta("/products/classic-card", null, product);
    expect(meta.title).toBe("Classic Visiting Card | Elite Impressions");
    expect(meta.canonical).toBe(`${APEX}/products/classic-card`);
    expect(meta.type).toBe("product");
    const ld = meta.jsonLd[0];
    expect(ld["@type"]).toBe("Product");
    expect(ld.offers.price).toBe(18);
    expect(ld.offers.availability).toBe("https://schema.org/InStock");
  });

  it("unknown path falls back to brand default", () => {
    const meta = resolveRouteMeta("/something", null, null);
    expect(meta.title).toBe("Elite Impressions | Premium Print Shop");
    expect(meta.canonical).toBe(`${APEX}/`);
  });
});

describe("injectMeta", () => {
  it("replaces the title and inserts one canonical + description + og + json-ld", () => {
    const meta = resolveRouteMeta("/", null, null);
    const html = injectMeta(TEMPLATE, meta);

    expect((html.match(/<title>/g) || []).length).toBe(1);
    // Title is HTML-escaped in the output (& -> &amp;), which is correct.
    expect(html).toMatch(/<title>[^<]*Custom Printing[^<]*Purnia[^<]*<\/title>/);
    expect((html.match(/rel="canonical"/g) || []).length).toBe(1);
    expect(html).toContain(`<link rel="canonical" href="${APEX}/" />`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('application/ld+json');
    // JSON-LD must be closed safely (no raw </script> breaking the tag).
    expect(html).not.toContain("</script></script>");
  });
});
