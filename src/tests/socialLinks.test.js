import { describe, it, expect } from "vitest";
import { __testing } from "../config/socialLinks";

const { isUsableUrl } = __testing;

describe("social link configuration", () => {
  it("accepts real absolute profile URLs", () => {
    expect(isUsableUrl("https://instagram.com/elite-empressions")).toBe(true);
    expect(isUsableUrl("http://example.com/page")).toBe(true);
    expect(isUsableUrl("  https://x.com/handle  ")).toBe(true);
  });

  it("rejects the placeholder that shipped as a dead button", () => {
    // The original footer had four of these: they looked clickable, took the
    // click, and did nothing.
    expect(isUsableUrl("#")).toBe(false);
  });

  it("rejects an unset Vite variable", () => {
    // An unset VITE_ var compiles to the literal string "undefined" rather
    // than being absent, so a naive truthiness check would render a link to
    // the path /undefined.
    expect(isUsableUrl(undefined)).toBe(false);
    expect(isUsableUrl("undefined")).toBe(false);
    expect(isUsableUrl("null")).toBe(false);
    expect(isUsableUrl("")).toBe(false);
    expect(isUsableUrl("   ")).toBe(false);
  });

  it("rejects a half-filled value that would resolve inside our own app", () => {
    // "instagram.com/x" without a protocol is a relative path — it would
    // navigate to /instagram.com/x on our own domain and hit the catch-all.
    expect(isUsableUrl("instagram.com/elite")).toBe(false);
    expect(isUsableUrl("/instagram")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isUsableUrl("javascript:alert(1)")).toBe(false);
    expect(isUsableUrl("data:text/html,hi")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isUsableUrl(null)).toBe(false);
    expect(isUsableUrl(42)).toBe(false);
    expect(isUsableUrl({})).toBe(false);
  });
});
