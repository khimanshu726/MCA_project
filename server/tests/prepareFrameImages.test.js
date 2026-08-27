import { describe, expect, it } from "vitest";
import { detectFormat, isMain, slotRank } from "../scripts/prepareFrameImages.js";

// The finalizer's pure helpers: format validation by magic bytes, MAIN
// detection, and slot ordering. (End-to-end copy/rename/manifest/zip is
// exercised manually against real saved images.)
const buf = (bytes, len = 32) => {
  const b = Buffer.alloc(len);
  bytes.forEach((v, i) => (b[i] = v));
  return b;
};

describe("prepareFrameImages helpers", () => {
  it("detects JPG/PNG/WEBP and rejects anything else", () => {
    expect(detectFormat(buf([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectFormat(buf([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
    expect(detectFormat(webp)).toBe("webp");
    expect(detectFormat(buf([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it("recognises MAIN only when clearly named", () => {
    expect(isMain("B0DNY13XGX_MAIN.jpg")).toBe(true);
    expect(isMain("photo_main_hash.jpg")).toBe(true);
    expect(isMain("B0DNY13XGX_01.jpg")).toBe(false);
    expect(isMain("maintenance.jpg")).toBe(false); // not a MAIN token
  });

  it("orders MAIN first, then PT01, PT02, … then unknowns", () => {
    expect(slotRank("x_MAIN.jpg")).toBe(0);
    expect(slotRank("x_PT01.jpg")).toBe(1);
    expect(slotRank("x_pt02.png")).toBe(2);
    expect(slotRank("x_03.jpg")).toBe(3);
    expect(slotRank("random.jpg")).toBe(999);
    expect(slotRank("x_MAIN.jpg")).toBeLessThan(slotRank("x_PT01.jpg"));
  });
});
