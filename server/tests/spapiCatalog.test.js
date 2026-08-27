import { describe, expect, it } from "vitest";
import { selectBestImages, variantRank } from "../scripts/spapiCatalog.js";

/**
 * SP-API returns each image variant at several resolutions; the fetcher must
 * pick the largest per variant and order MAIN → PT01 → PT02 → …
 */
const response = {
  asin: "B0DNY13XGX",
  images: [
    {
      marketplaceId: "A21TJRUUN4KGV",
      images: [
        { variant: "PT01", link: "https://m.media-amazon.com/pt01_small.jpg", width: 500, height: 500 },
        { variant: "PT01", link: "https://m.media-amazon.com/pt01_large.jpg", width: 1600, height: 1600 },
        { variant: "MAIN", link: "https://m.media-amazon.com/main_large.jpg", width: 2000, height: 2000 },
        { variant: "MAIN", link: "https://m.media-amazon.com/main_tiny.jpg", width: 75, height: 75 },
        { variant: "PT02", link: "https://m.media-amazon.com/pt02.jpg", width: 1600, height: 1600 },
      ],
    },
    { marketplaceId: "OTHER", images: [{ variant: "MAIN", link: "https://x/wrong.jpg", width: 9, height: 9 }] },
  ],
};

describe("SP-API catalog image selection", () => {
  it("ranks MAIN before PT01 before PT02, others last", () => {
    expect(variantRank("MAIN")).toBe(0);
    expect(variantRank("PT01")).toBeLessThan(variantRank("PT02"));
    expect(variantRank("SWCH")).toBeGreaterThan(variantRank("PT08"));
  });

  it("picks the highest-resolution image per variant, from the right marketplace, in order", () => {
    const images = selectBestImages(response, "A21TJRUUN4KGV");

    expect(images.map((i) => i.variant)).toEqual(["MAIN", "PT01", "PT02"]);
    expect(images[0].link).toBe("https://m.media-amazon.com/main_large.jpg"); // 2000, not the 75px thumb
    expect(images[1].link).toBe("https://m.media-amazon.com/pt01_large.jpg"); // 1600, not 500
    expect(images.every((i) => !i.link.includes("wrong"))).toBe(true); // ignored the other marketplace
  });

  it("returns nothing when there are no images", () => {
    expect(selectBestImages({ asin: "X", images: [] }, "A21TJRUUN4KGV")).toEqual([]);
  });
});
