import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PINCODE_STATUS, lookupPincode } from "../utils/pincodeApi";

const postOfficeResponse = (overrides = {}) => ({
  ok: true,
  json: async () => [
    {
      Status: "Success",
      PostOffice: [{ Name: "Bhatta Bazar", District: "Purnia", State: "Bihar", ...overrides }],
    },
  ],
});

describe("pincode lookup", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns city and state for a real pincode", async () => {
    global.fetch.mockResolvedValue(postOfficeResponse());

    const result = await lookupPincode("854301");

    expect(result.status).toBe(PINCODE_STATUS.FOUND);
    expect(result.city).toBe("Purnia");
    expect(result.state).toBe("Bihar");
  });

  it("reports an unrecognised pincode as not found, not as an outage", async () => {
    // The customer mistyped. This is the one case where it is correct to tell
    // them their pincode is wrong.
    global.fetch.mockResolvedValue({ ok: true, json: async () => [{ Status: "Error" }] });

    const result = await lookupPincode("999999");

    expect(result.status).toBe(PINCODE_STATUS.NOT_FOUND);
  });

  it("reports a network failure as unavailable, never as a bad pincode", async () => {
    // Blaming the customer's input for our own connectivity problem sends them
    // hunting for a typo in a pincode that is perfectly correct.
    global.fetch.mockRejectedValue(new Error("offline"));

    const result = await lookupPincode("110001");

    expect(result.status).toBe(PINCODE_STATUS.UNAVAILABLE);
  });

  it("treats a non-ok HTTP response as unavailable too", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503 });

    const result = await lookupPincode("400001");

    expect(result.status).toBe(PINCODE_STATUS.UNAVAILABLE);
  });

  it("does not re-request a pincode it has already resolved", async () => {
    global.fetch.mockResolvedValue(postOfficeResponse());

    await lookupPincode("560001");
    await lookupPincode("560001");
    await lookupPincode("560001");

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("caches a not-found answer, since it will not change either", async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [{ Status: "Error" }] });

    await lookupPincode("888888");
    const second = await lookupPincode("888888");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(second.status).toBe(PINCODE_STATUS.NOT_FOUND);
  });

  it("does NOT cache an unreachable service", async () => {
    // Caching this would strand the customer on manual entry for the rest of
    // the session, long after the network recovered.
    global.fetch.mockRejectedValueOnce(new Error("offline"));
    const first = await lookupPincode("700001");
    expect(first.status).toBe(PINCODE_STATUS.UNAVAILABLE);

    global.fetch.mockResolvedValueOnce(postOfficeResponse({ District: "Kolkata", State: "West Bengal" }));
    const second = await lookupPincode("700001");

    expect(second.status).toBe(PINCODE_STATUS.FOUND);
    expect(second.city).toBe("Kolkata");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("treats a success response with no post office as not found", async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [{ Status: "Success", PostOffice: null }] });

    const result = await lookupPincode("123456");

    expect(result.status).toBe(PINCODE_STATUS.NOT_FOUND);
  });
});
