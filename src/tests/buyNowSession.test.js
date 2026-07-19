import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  BUY_NOW_TTL_MS,
  clearBuyNowSession,
  hasBuyNowSession,
  loadBuyNowSession,
  storeBuyNowSession,
  updateBuyNowQuantity,
} from "../utils/buyNowSession";

describe("buyNowSession", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips a purchase intent including its customization payload", () => {
    const customization = {
      optionsSummary: "350 GSM Matte, Rounded corners",
      uploadedImage: "blob-ref",
      text: "Elite Empressions",
      fonts: ["Fraunces"],
      colors: ["#b8461d"],
      positioning: { x: 12, y: 30 },
    };

    storeBuyNowSession({ productId: "p1", quantity: 250, customization, unitPriceAtStart: 79 });

    const loaded = loadBuyNowSession();
    expect(loaded.productId).toBe("p1");
    expect(loaded.quantity).toBe(250);
    expect(loaded.unitPriceAtStart).toBe(79);
    // The whole customization bag must survive the round trip untouched —
    // this is what "Buy Now must preserve the customization" reduces to.
    expect(loaded.customization).toEqual(customization);
  });

  it("refuses to store an intent with no product or a nonsense quantity", () => {
    expect(storeBuyNowSession({ productId: "", quantity: 5 })).toBeNull();
    expect(storeBuyNowSession({ productId: "p1", quantity: 0 })).toBeNull();
    expect(storeBuyNowSession({ productId: "p1", quantity: -3 })).toBeNull();
    expect(loadBuyNowSession()).toBeNull();
  });

  it("reports an expired session as expired rather than as absent", () => {
    storeBuyNowSession({ productId: "p1", quantity: 1 });

    // Past the TTL. "Expired" and "never existed" must stay distinguishable:
    // the first deserves "your checkout timed out", the second a silent
    // redirect, and conflating them is how a customer gets bounced to the
    // product list with no explanation.
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + BUY_NOW_TTL_MS + 1000);

    expect(loadBuyNowSession()).toEqual({ expired: true });
    expect(hasBuyNowSession()).toBe(false);

    Date.now.mockRestore();
    // The expired record is cleared on read, not left to be re-read later.
    expect(loadBuyNowSession()).toBeNull();
  });

  it("updates quantity without sliding the expiry window forward", () => {
    const created = storeBuyNowSession({ productId: "p1", quantity: 10 });
    const updated = updateBuyNowQuantity(25);

    expect(updated.quantity).toBe(25);
    // The window bounds how stale the *price* may be; changing quantity does
    // not re-fetch the price, so it must not buy more time.
    expect(updated.expiresAt).toBe(created.expiresAt);
    expect(loadBuyNowSession().quantity).toBe(25);
  });

  it("ignores an invalid quantity update rather than corrupting the session", () => {
    storeBuyNowSession({ productId: "p1", quantity: 10 });

    expect(updateBuyNowQuantity(0).quantity).toBe(10);
    expect(updateBuyNowQuantity(Number.NaN).quantity).toBe(10);
    expect(loadBuyNowSession().quantity).toBe(10);
  });

  it("survives corrupted storage by clearing it instead of throwing", () => {
    window.sessionStorage.setItem("ee-buy-now-session", "{not json");

    expect(loadBuyNowSession()).toBeNull();
    expect(window.sessionStorage.getItem("ee-buy-now-session")).toBeNull();
  });

  it("clears on demand", () => {
    storeBuyNowSession({ productId: "p1", quantity: 1 });
    expect(hasBuyNowSession()).toBe(true);

    clearBuyNowSession();
    expect(hasBuyNowSession()).toBe(false);
  });
});
