import { describe, expect, it } from "vitest";
import { COURIERS, COURIER_IDS, buildTrackingUrl, getCourierName } from "../utils/couriers.js";

/**
 * The rule this module exists to enforce: never hand a customer a link that
 * claims to be their parcel and isn't. A dead tracking URL is worse than a
 * plain number they can paste into the courier's own site themselves.
 */
describe("buildTrackingUrl", () => {
  it("builds a link for a courier that has a public tracking page", () => {
    expect(buildTrackingUrl("delhivery", "1234567890")).toBe(
      "https://www.delhivery.com/track/package/1234567890",
    );
  });

  it("returns null for a courier with no linkable tracking page", () => {
    // India Post tracking is a stateful form post, so there is no URL to build.
    expect(buildTrackingUrl("indiapost", "EE123456789IN")).toBeNull();
  });

  it("returns null for a local courier we know nothing about", () => {
    expect(buildTrackingUrl("other", "LOCAL-99")).toBeNull();
  });

  it("returns null rather than a broken link when there is no tracking number", () => {
    expect(buildTrackingUrl("delhivery", "")).toBeNull();
    expect(buildTrackingUrl("delhivery", "   ")).toBeNull();
    expect(buildTrackingUrl("delhivery", null)).toBeNull();
  });

  it("returns null when no courier has been chosen", () => {
    expect(buildTrackingUrl("", "1234567890")).toBeNull();
    expect(buildTrackingUrl(undefined, "1234567890")).toBeNull();
  });

  it("returns null for a courier id that isn't ours", () => {
    expect(buildTrackingUrl("not-a-courier", "1234567890")).toBeNull();
  });

  it("escapes the tracking number so it can't break out of the URL", () => {
    const url = buildTrackingUrl("xpressbees", "a b&c=d");
    expect(url).toContain("a%20b%26c%3Dd");
    expect(url).not.toContain("&c=d");
  });
});

describe("getCourierName", () => {
  it("names a known courier", () => {
    expect(getCourierName("bluedart")).toBe("Blue Dart");
  });

  it("is blank for unknown or unset, so the UI renders nothing rather than 'undefined'", () => {
    expect(getCourierName("nope")).toBe("");
    expect(getCourierName("")).toBe("");
  });
});

describe("the registry itself", () => {
  it("gives every courier an id and a name", () => {
    for (const courier of COURIERS) {
      expect(courier.id).toBeTruthy();
      expect(courier.name).toBeTruthy();
    }
  });

  it("has no duplicate ids — the admin dropdown and the customer link key off these", () => {
    expect(new Set(COURIER_IDS).size).toBe(COURIER_IDS.length);
  });

  it("only ever builds https links", () => {
    for (const courier of COURIERS) {
      if (typeof courier.trackingUrl === "function") {
        expect(courier.trackingUrl("TEST123")).toMatch(/^https:\/\//);
      }
    }
  });

  it("keeps an escape hatch for couriers not on the list", () => {
    expect(COURIER_IDS).toContain("other");
  });
});
