import { afterEach, describe, expect, it, vi } from "vitest";

// Firestore that never resolves — simulates an unreachable / unprovisioned
// database (the state that made Google login hang ~a minute).
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ id: "ref" })),
  getDoc: vi.fn(() => new Promise(() => {})),
  setDoc: vi.fn(() => new Promise(() => {})),
  serverTimestamp: vi.fn(() => "ts"),
}));

// Minimal firebase wrapper: firestoreDb must be truthy so the sync attempts a
// write; the auth exports aren't exercised by this test.
vi.mock("../lib/firebase", () => ({
  firestoreDb: { __mock: true },
  ensureFirebaseAuth: vi.fn(),
  ensureFirebasePersistence: vi.fn(),
  facebookProvider: {},
  googleProvider: {},
}));

const { syncCustomerUserDocument } = await import("../services/customerAuthService");

describe("syncCustomerUserDocument (best-effort Firestore mirror)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves to null on timeout instead of hanging when Firestore is unreachable", async () => {
    vi.useFakeTimers();

    const result = syncCustomerUserDocument({
      uid: "user-1",
      email: "buyer@example.com",
      emailVerified: true,
      displayName: "Test Buyer",
    });

    // Trip the internal 4s timeout; the underlying getDoc/setDoc never settle.
    await vi.advanceTimersByTimeAsync(4001);

    await expect(result).resolves.toBeNull();
  });
});
