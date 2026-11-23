import { describe, expect, it } from "vitest";
import { formatLeadTime } from "../utils/leadTime";

describe("formatLeadTime", () => {
  it("writes out a bare number of days", () => {
    expect(formatLeadTime("6")).toBe("Ready in 6 days");
    expect(formatLeadTime(" 4 ")).toBe("Ready in 4 days");
    expect(formatLeadTime("1")).toBe("Ready in 1 day");
    expect(formatLeadTime(5)).toBe("Ready in 5 days");
  });

  it("writes out a range and day counts with a unit", () => {
    expect(formatLeadTime("3-5")).toBe("Ready in 3-5 days");
    expect(formatLeadTime("3 – 5")).toBe("Ready in 3-5 days");
    expect(formatLeadTime("3 to 5 days")).toBe("Ready in 3-5 days");
    expect(formatLeadTime("6 days")).toBe("Ready in 6 days");
    expect(formatLeadTime("7 working days")).toBe("Ready in 7 days");
  });

  it("keeps a phrase as typed", () => {
    expect(formatLeadTime("Ready in 6-8 days")).toBe("Ready in 6-8 days");
    expect(formatLeadTime("Same day pickup")).toBe("Same day pickup");
  });

  it("is empty for nothing", () => {
    expect(formatLeadTime("")).toBe("");
    expect(formatLeadTime(null)).toBe("");
    expect(formatLeadTime(undefined)).toBe("");
  });
});
