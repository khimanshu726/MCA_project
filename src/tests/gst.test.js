import { describe, expect, it } from "vitest";
import { GST_STATE_NAMES, rateForHsn, stateCodeFromName, validateGstin } from "../utils/gst";

describe("validateGstin", () => {
  it("accepts the shop's GSTIN from its registration certificate", () => {
    expect(validateGstin("10ADTPM9552H1Z8")).toEqual({ valid: true, gstin: "10ADTPM9552H1Z8", stateCode: "10", reason: null });
  });

  it("normalises case and spaces", () => {
    expect(validateGstin("  10adtpm9552h1z8 ").valid).toBe(true);
  });

  it("rejects the letter I typed for the digit 1 via the check character", () => {
    const result = validateGstin("10ADTPM9552HIZ8");
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/letter I/);
  });

  it.each([
    ["too short", "10ADTPM9552H1Z"],
    ["wrong 14th character", "10ADTPM9552H1A8"],
    ["unknown state code", "00ADTPM9552H1Z8"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(validateGstin(value).valid).toBe(false);
  });
});

describe("stateCodeFromName", () => {
  it.each([
    ["Bihar", "10"],
    ["BIHAR", "10"],
    ["Tamil Nadu", "33"],
    ["Jammu & Kashmir", "01"],
    ["Orissa", "21"],
    ["NCT of Delhi", "07"],
    ["Andhra Pradesh", "37"],
  ])("%s → %s", (name, code) => {
    expect(stateCodeFromName(name)).toBe(code);
  });

  it("returns null for an unknown state rather than guessing", () => {
    expect(stateCodeFromName("Narnia")).toBeNull();
    expect(stateCodeFromName("")).toBeNull();
  });

  it("has a name for every code it maps to", () => {
    expect(GST_STATE_NAMES[stateCodeFromName("Bihar")]).toBe("Bihar");
  });
});

describe("rateForHsn", () => {
  const flat = { rate: 18, priceThreshold: null, rateAboveThreshold: null };
  const garments = { rate: 5, priceThreshold: 2500, rateAboveThreshold: 18 };
  const nil = { rate: 0 };

  it("returns the flat rate", () => {
    expect(rateForHsn(flat, 99999)).toBe(18);
  });

  it("applies a value-based rate at and around the price limit", () => {
    expect(rateForHsn(garments, 2499)).toBe(5);
    expect(rateForHsn(garments, 2500)).toBe(5);
    expect(rateForHsn(garments, 2501)).toBe(18);
  });

  it("handles Nil-rated codes", () => {
    expect(rateForHsn(nil, 100)).toBe(0);
  });

  it("returns null when there is no code", () => {
    expect(rateForHsn(null, 100)).toBeNull();
  });
});
