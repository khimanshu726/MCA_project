import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../index.js";

/**
 * The endpoint's whole job is to describe payment config without disclosing
 * it, so the load-bearing assertions here are the negative ones: no secret
 * may appear in the payload, in any form. Everything else is diagnostics.
 */
describe("GET /api/health", () => {
  const snapshot = {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  };

  beforeEach(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("never discloses the key secret or the webhook secret", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_AbCdEfGhIjKlMn";
    process.env.RAZORPAY_KEY_SECRET = "keySecretMustNeverLeak";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhookSecretMustNeverLeak";

    const response = await request(app).get("/api/health").expect(200);
    const payload = JSON.stringify(response.body);

    expect(payload).not.toContain("keySecretMustNeverLeak");
    expect(payload).not.toContain("webhookSecretMustNeverLeak");
    // Not even a fragment: a prefix is enough to shrink a brute-force space.
    expect(payload).not.toContain("keySecret");
    expect(payload).not.toContain("webhookSecretMust");
  });

  it("reports the mode and the public key's last 4", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_AbCdEfGhIjKlMn";

    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.razorpay.mode).toBe("test");
    expect(response.body.razorpay.keyIdLast4).toBe("KlMn");
  });

  it("distinguishes live keys from test keys", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_live_ZyXwVuTsRq";

    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.razorpay.mode).toBe("live");
  });

  it("reports null mode when no key id is configured", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.razorpay.mode).toBeNull();
    expect(response.body.razorpay.keyIdLast4).toBeNull();
  });

  it("reports the webhook secret as a boolean only", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhookSecretMustNeverLeak";

    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.razorpay.webhookSecretSet).toBe(true);
  });

  it("reports the webhook secret as unset when absent", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.razorpay.webhookSecretSet).toBe(false);
  });
});
