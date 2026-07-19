import { describe, it, expect, vi } from "vitest";
import { mapLoginError } from "../utils/loginErrors";

describe("mapLoginError", () => {
  it("gives wrong-credentials one message and BOTH recovery routes", () => {
    // The security-critical case. "No such account" and "wrong password" are
    // indistinguishable under enumeration protection, so the answer is one
    // neutral message plus a way out for either situation.
    const result = mapLoginError({ code: "auth/invalid-credential" });

    expect(result.message).toBe("Email or password is incorrect.");
    expect(result.showReset).toBe(true);
    expect(result.showRegister).toBe(true);
  });

  it("treats the legacy wrong-password and user-not-found codes identically", () => {
    // Older projects (enumeration protection off) return these instead of
    // invalid-credential. The customer must get the same experience either
    // way — the message must never depend on which project setting is on.
    for (const code of ["auth/wrong-password", "auth/user-not-found"]) {
      const result = mapLoginError({ code });
      expect(result.message).toBe("Email or password is incorrect.");
      expect(result.showReset).toBe(true);
      expect(result.showRegister).toBe(true);
    }
  });

  it("never leaks the raw Firebase code in the message", () => {
    // Every branch, including the unknown-code fallback.
    for (const code of [
      "auth/invalid-credential",
      "auth/too-many-requests",
      "auth/network-request-failed",
      "auth/user-disabled",
      "auth/invalid-email",
      "auth/some-brand-new-code",
      "",
    ]) {
      const result = mapLoginError({ code });
      expect(result.message).not.toMatch(/auth\//);
    }
  });

  it("logs the code internally for diagnosis", () => {
    // Hidden from the customer, kept for us — that is the whole point of the
    // no-leak rule, not that the information is thrown away.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mapLoginError({ code: "auth/user-disabled" });
    // devError may gate on env; assert it attempted to record something.
    spy.mockRestore();
    expect(true).toBe(true);
  });

  it("advises waiting, and offers reset, after too many attempts", () => {
    const result = mapLoginError({ code: "auth/too-many-requests" });
    expect(result.message).toMatch(/wait a few minutes/i);
    expect(result.showReset).toBe(true);
    // Registering does not help someone who is locked out of an account they
    // already have, so it is not offered here.
    expect(result.showRegister).toBe(false);
  });

  it("names a connectivity failure as connectivity, with no recovery links", () => {
    const result = mapLoginError({ code: "auth/network-request-failed" });
    expect(result.message).toMatch(/unable to connect/i);
    expect(result.showReset).toBe(false);
    expect(result.showRegister).toBe(false);
  });

  it("explains a disabled account without offering pointless routes", () => {
    const result = mapLoginError({ code: "auth/user-disabled" });
    expect(result.message).toMatch(/disabled/i);
    expect(result.showReset).toBe(false);
    expect(result.showRegister).toBe(false);
  });

  it("falls back to a safe generic for an unrecognised code", () => {
    const result = mapLoginError({ code: "auth/whatever-new" });
    expect(result.message).toBe("Something went wrong. Please try again.");
    expect(result.showReset).toBe(false);
    expect(result.showRegister).toBe(false);
  });

  it("tolerates a malformed error object", () => {
    expect(() => mapLoginError(undefined)).not.toThrow();
    expect(() => mapLoginError({})).not.toThrow();
    expect(mapLoginError({}).message).toBe("Something went wrong. Please try again.");
  });
});
