import { describe, it, expect, vi } from "vitest";
import { getImageSrcSet, getOptimizedImageUrl, warmImageCache } from "../utils/imageUrl";

describe("getOptimizedImageUrl", () => {
  it("appends width/compression params for recognized Pexels URLs", () => {
    const result = getOptimizedImageUrl("https://images.pexels.com/photos/1/pexels-photo-1.jpeg", { width: 400 });
    const url = new URL(result);
    expect(url.hostname).toBe("images.pexels.com");
    expect(url.searchParams.get("w")).toBe("400");
    expect(url.searchParams.get("auto")).toBe("compress");
  });

  it("strips a pre-existing h/fit=crop pair instead of pairing it with a new, mismatched width", () => {
    // Regression: seed product images already carry a baked-in w/h/fit=crop
    // (see createImageSet in src/data.js) sized for the full gallery image.
    // Overriding just `w` while leaving that `h` in place made Pexels crop
    // to a razor-thin sliver (e.g. w=44 with a leftover h=1120), which
    // object-fit: cover then stretched to fill the thumbnail — the
    // "impossible to tell what it was" zoomed-in bug.
    const original = "https://images.pexels.com/photos/1/pexels-photo-1.jpeg?w=1400&h=1120&fit=crop";
    const result = getOptimizedImageUrl(original, { width: 44 });
    const url = new URL(result);
    expect(url.searchParams.get("w")).toBe("44");
    expect(url.searchParams.has("h")).toBe(false);
    expect(url.searchParams.has("fit")).toBe(false);
  });

  it("rewrites Cloudinary /upload/ URLs with a transform segment", () => {
    const result = getOptimizedImageUrl("https://res.cloudinary.com/demo/image/upload/v1/sample.jpg", {
      width: 300,
    });
    expect(result).toBe("https://res.cloudinary.com/demo/image/upload/w_300,q_auto,f_auto/v1/sample.jpg");
  });

  it("passes through unrecognized hosts unchanged", () => {
    const src = "https://example.com/product.jpg";
    expect(getOptimizedImageUrl(src, { width: 400 })).toBe(src);
  });

  it("passes through when no width is given", () => {
    const src = "https://images.pexels.com/photos/1/pexels-photo-1.jpeg";
    expect(getOptimizedImageUrl(src)).toBe(src);
  });

  it("returns falsy src as-is instead of throwing", () => {
    expect(getOptimizedImageUrl(undefined, { width: 400 })).toBeUndefined();
    expect(getOptimizedImageUrl("", { width: 400 })).toBe("");
  });

  it("does not throw on a malformed URL", () => {
    expect(() => getOptimizedImageUrl("not a url", { width: 400 })).not.toThrow();
  });
});

describe("getImageSrcSet", () => {
  it("builds a width-descriptor srcset for a recognized host", () => {
    const result = getImageSrcSet("https://images.pexels.com/photos/1/pexels-photo-1.jpeg", [400, 800]);
    expect(result).toContain("400w");
    expect(result).toContain("800w");
  });

  it("returns undefined for an unrecognized host", () => {
    expect(getImageSrcSet("https://example.com/product.jpg", [400, 800])).toBeUndefined();
  });
});

describe("warmImageCache", () => {
  it("creates an Image() for each url without throwing", () => {
    expect(() => warmImageCache(["https://example.com/a.jpg", undefined, "https://example.com/b.jpg"])).not.toThrow();
  });

  it("does nothing for an empty list", () => {
    expect(() => warmImageCache()).not.toThrow();
    expect(() => warmImageCache([])).not.toThrow();
  });
});
