import { describe, expect, it } from "vitest";
import {
  buildIdentifierIndex,
  isMainImage,
  matchFile,
  matchImagesToProducts,
  readDataset,
} from "../scripts/imageMatching.js";

/**
 * Image → product matching is by ASIN → SKU → mapping file only, never by
 * product name. Ram Lala's colour-variant identifiers all resolve to the single
 * merged product while recording which colour each image belongs to. Runs
 * against the real data/photo-frames.json so the identifiers can't drift.
 */
const { products } = readDataset();
const index = buildIdentifierIndex(products);

describe("image matching", () => {
  it("matches by ASIN, then by SKU", () => {
    expect(matchFile("B0DNXWGQYR_MAIN.jpg", index)).toMatchObject({ id: "buddha-a3-frame", by: "asin" });
    expect(matchFile("AN-ES38-9WTF-01.jpg", index)).toMatchObject({ id: "buddha-a3-frame", by: "sku" });
  });

  it("routes Ram Lala colour identifiers to the merged product, tagged by colour", () => {
    expect(matchFile("B0DND1MC6D_02.jpg", index)).toMatchObject({ id: "ram-lala-a3-frame", variant: "Pink" });
    expect(matchFile("Ramlala_Red_1.jpg", index)).toMatchObject({ id: "ram-lala-a3-frame", variant: "Red" });
  });

  it("never guesses from the product name — an id-less filename is unmatched", () => {
    expect(matchFile("lord-buddha-lifestyle.jpg", index)).toBeNull();
    expect(matchFile("iron-man-frame.png", index)).toBeNull();
  });

  it("flags an ASIN that names no product in the dataset", () => {
    expect(matchFile("B0XXXXXXXX_1.jpg", index)).toMatchObject({ asinNotFound: "B0XXXXXXXX" });
  });

  it("resolves via an explicit mapping entry when the filename has no identifier", () => {
    const map = new Map([["photo123.jpg", { asin: "B0DLVY4LPV", sku: "" }]]);
    expect(matchFile("photo123.jpg", index, map)).toMatchObject({ id: "krishna-a3-frame", by: "asin" });
  });

  it("detects the MAIN image and marks it primary + first", () => {
    expect(isMainImage("B0DNXWGQYR_MAIN.jpg")).toBe(true);
    expect(isMainImage("B0DNXWGQYR_02.jpg")).toBe(false);

    const { perProduct } = matchImagesToProducts(
      ["B0DNXWGQYR_02.jpg", "B0DNXWGQYR_MAIN.jpg", "B0DNXWGQYR_01.jpg"],
      products,
    );
    const bucket = perProduct.get("buddha-a3-frame");
    expect(bucket.hasMain).toBe(true);
    expect(bucket.files[0].relPath).toMatch(/MAIN/); // main sorted first
    expect(bucket.files[0].isMain).toBe(true);
  });

  it("reports no-main, unmatched, and asin-not-found separately", () => {
    const { perProduct, unmatched, asinNotFound } = matchImagesToProducts(
      ["B0DLVY4LPV_a.jpg", "random.jpg", "B0XXXXXXXX_1.jpg"],
      products,
    );
    expect(perProduct.get("krishna-a3-frame").hasMain).toBe(false); // no MAIN in name
    expect(unmatched).toEqual(["random.jpg"]);
    expect(asinNotFound).toEqual([{ relPath: "B0XXXXXXXX_1.jpg", asin: "B0XXXXXXXX" }]);
  });
});
