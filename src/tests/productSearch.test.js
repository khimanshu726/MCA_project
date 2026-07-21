import { describe, it, expect } from "vitest";
import {
  buildSearchDocument,
  searchDocuments,
  getHighlightSegments,
  boundedEditDistance,
  isSubsequence,
} from "../utils/productSearch";

// A catalog broad enough to exercise field matching, ranking, and typos.
const CATALOG = [
  { id: "business-cards", name: "Business Cards", category: "Stationery", description: "Premium matte and gloss business cards.", materials: ["350gsm"], audience: "Professionals" },
  { id: "business-flyers", name: "Business Flyers", category: "Marketing", description: "A4 and A5 promotional flyers.", materials: [], audience: "" },
  { id: "business-stationery", name: "Business Stationery", category: "Stationery", description: "Letterheads and envelopes.", materials: [], audience: "" },
  { id: "custom-tshirts", name: "Custom T-Shirts", category: "Apparel", description: "Cotton printed tees.", materials: ["cotton"], audience: "Teams" },
  { id: "corporate-tshirts", name: "Corporate T-Shirts", category: "Apparel", description: "Branded staff shirts.", materials: [], audience: "" },
  { id: "tote-bags", name: "Tote Bags", category: "Merchandise", description: "Canvas carry bags.", materials: ["canvas"], audience: "" },
  { id: "storefront-banner", name: "Storefront Banner", category: "Signage", description: "Weatherproof vinyl banner.", materials: ["vinyl"], audience: "" },
  { id: "packaging-boxes", name: "Packaging Boxes", category: "Packaging", description: "Custom mailer and product boxes.", materials: ["kraft"], audience: "" },
  { id: "thank-you-cards", name: "Thank You Cards", category: "Stationery", description: "Folded greeting cards.", materials: [], audience: "" },
  { id: "coffee-mugs", name: "Coffee Mugs", category: "Merchandise", description: "Ceramic printed mugs.", materials: ["ceramic"], audience: "" },
];

const DOCS = CATALOG.map(buildSearchDocument);
const namesFor = (query, opts) => searchDocuments(DOCS, query, opts).map((p) => p.name);

describe("boundedEditDistance", () => {
  it("counts a transposition as one (Damerau)", () => {
    expect(boundedEditDistance("buisness", "business", 2)).toBe(1);
  });
  it("bails out cheaply past the budget", () => {
    expect(boundedEditDistance("apple", "orange", 1)).toBe(2); // max + 1
  });
});

describe("isSubsequence", () => {
  it("finds a collapsed subsequence", () => {
    expect(isSubsequence("tshrt", "tshirts")).toBe(true);
    expect(isSubsequence("xyz", "tshirts")).toBe(false);
  });
});

describe("searchDocuments — prefix and field matching", () => {
  it("suggests instantly on a short prefix", () => {
    expect(namesFor("fly")).toContain("Business Flyers");
  });

  it("matches across fields, not just the title (category / description)", () => {
    // "shirt" appears in the name; "apparel" only in the category.
    expect(namesFor("shirt")).toEqual(expect.arrayContaining(["Custom T-Shirts", "Corporate T-Shirts"]));
    expect(namesFor("apparel")).toEqual(expect.arrayContaining(["Custom T-Shirts", "Corporate T-Shirts"]));
  });

  it("returns every business-prefixed product for 'business'", () => {
    expect(namesFor("business")).toEqual(
      expect.arrayContaining(["Business Cards", "Business Flyers", "Business Stationery"]),
    );
  });

  it("applies AND semantics for multi-word queries", () => {
    const results = namesFor("business flyers");
    expect(results).toContain("Business Flyers");
    expect(results).not.toContain("Coffee Mugs");
  });

  it("returns nothing for a query that matches no field", () => {
    expect(namesFor("qwertyzxcv")).toEqual([]);
  });
});

describe("searchDocuments — typo tolerance (fuzzy)", () => {
  const cases = [
    ["buisness", "Business Cards"],
    ["flier", "Business Flyers"],
    ["tshrt", "Custom T-Shirts"],
    ["baner", "Storefront Banner"],
    ["packeging", "Packaging Boxes"],
  ];
  for (const [typo, expected] of cases) {
    it(`"${typo}" still finds ${expected}`, () => {
      expect(namesFor(typo)).toContain(expected);
    });
  }
});

describe("searchDocuments — ranking and limit", () => {
  it("ranks an exact/prefix name hit above a fuzzy one", () => {
    const results = namesFor("business");
    expect(results[0]).toMatch(/^Business/);
  });
  it("respects the result limit", () => {
    expect(searchDocuments(DOCS, "s", { limit: 3 }).length).toBeLessThanOrEqual(3);
  });
});

describe("getHighlightSegments", () => {
  it("marks the matched substring of the name", () => {
    const segments = getHighlightSegments("Business Flyers", "fly");
    const highlighted = segments.filter((s) => s.match).map((s) => s.text.toLowerCase());
    expect(highlighted).toContain("fly");
    // The full text is preserved when segments are concatenated.
    expect(segments.map((s) => s.text).join("")).toBe("Business Flyers");
  });

  it("bolds the relevant word even for a typo'd query", () => {
    const segments = getHighlightSegments("Custom T-Shirts", "tshrt");
    expect(segments.some((s) => s.match)).toBe(true);
    expect(segments.map((s) => s.text).join("")).toBe("Custom T-Shirts");
  });

  it("returns the text unmarked when the query is empty", () => {
    expect(getHighlightSegments("Business Cards", "")).toEqual([{ text: "Business Cards", match: false }]);
  });
});
