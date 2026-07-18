import { describe, it, expect } from "vitest";
import {
  IDLE_TIMEOUT_MS,
  SESSION_ENDED,
  SESSION_MAX_AGE_MS,
  evaluateSession,
  getSessionMaxAgeMs,
  isSessionIdle,
  isSessionMaxAgeExceeded,
  sessionEndedMessage,
} from "../auth/sessionPolicy";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 6, 18, 12, 0, 0);

describe("session max age", () => {
  it("keeps a fresh session valid under both policies", () => {
    const authTime = NOW - 1 * HOUR;
    expect(isSessionMaxAgeExceeded(authTime, false, NOW)).toBe(false);
    expect(isSessionMaxAgeExceeded(authTime, true, NOW)).toBe(false);
  });

  it("expires a not-remembered session after 12 hours but keeps a remembered one", () => {
    const authTime = NOW - 13 * HOUR;
    expect(isSessionMaxAgeExceeded(authTime, false, NOW)).toBe(true);
    expect(isSessionMaxAgeExceeded(authTime, true, NOW)).toBe(false);
  });

  it("expires even a remembered session at the 30-day ceiling", () => {
    // The whole point of the change: "remember me" must not mean "forever".
    // This is the ceiling an attacker holding a stolen refresh token inherits.
    expect(isSessionMaxAgeExceeded(NOW - 29 * DAY, true, NOW)).toBe(false);
    expect(isSessionMaxAgeExceeded(NOW - 31 * DAY, true, NOW)).toBe(true);
  });

  it("treats a missing or nonsensical auth time as expired, never as valid", () => {
    // Failing open here would hand an unbounded session to exactly the
    // malformed token we cannot reason about.
    expect(isSessionMaxAgeExceeded(undefined, true, NOW)).toBe(true);
    expect(isSessionMaxAgeExceeded(null, true, NOW)).toBe(true);
    expect(isSessionMaxAgeExceeded(Number.NaN, true, NOW)).toBe(true);
    expect(isSessionMaxAgeExceeded(0, true, NOW)).toBe(true);
    expect(isSessionMaxAgeExceeded(-5, true, NOW)).toBe(true);
  });

  it("rejects an auth time implausibly far in the future", () => {
    expect(isSessionMaxAgeExceeded(NOW + 10 * MINUTE, true, NOW)).toBe(true);
  });

  it("tolerates small clock skew rather than rejecting a just-minted token", () => {
    // A server running a minute behind Google must not read a token issued
    // moments ago as issued in the future and bounce a good login.
    expect(isSessionMaxAgeExceeded(NOW + 60 * 1000, true, NOW)).toBe(false);
  });

  it("exposes the two windows", () => {
    expect(getSessionMaxAgeMs(true)).toBe(SESSION_MAX_AGE_MS.remembered);
    expect(getSessionMaxAgeMs(false)).toBe(SESSION_MAX_AGE_MS.default);
    expect(SESSION_MAX_AGE_MS.remembered).toBeLessThanOrEqual(30 * DAY);
  });
});

describe("idle timeout", () => {
  it("does not consider recent activity idle", () => {
    expect(isSessionIdle(NOW - 5 * MINUTE, NOW)).toBe(false);
  });

  it("flags inactivity past the threshold", () => {
    expect(isSessionIdle(NOW - IDLE_TIMEOUT_MS - MINUTE, NOW)).toBe(true);
  });

  it("is not aggressive enough to interrupt normal shopping", () => {
    // Comparing products in another tab for an hour is not idle in any sense
    // that should cost someone their basket.
    expect(isSessionIdle(NOW - 1 * HOUR, NOW)).toBe(false);
  });

  it("treats an unknown last-activity as active, not idle", () => {
    // Unlike auth_time, an absent activity stamp means "we just started
    // tracking", not "possibly ancient" — signing someone out over it would
    // log them out for opening the site.
    expect(isSessionIdle(undefined, NOW)).toBe(false);
    expect(isSessionIdle(0, NOW)).toBe(false);
  });
});

describe("evaluateSession", () => {
  it("passes a fresh, active, remembered session", () => {
    expect(
      evaluateSession({ authTimeMs: NOW - HOUR, lastActivityMs: NOW - MINUTE, rememberMe: true }, NOW),
    ).toEqual({ valid: true, reason: null });
  });

  it("reports expiry and idleness distinctly, so the UI can explain itself", () => {
    expect(
      evaluateSession({ authTimeMs: NOW - 40 * DAY, lastActivityMs: NOW, rememberMe: true }, NOW).reason,
    ).toBe(SESSION_ENDED.EXPIRED);

    expect(
      evaluateSession(
        { authTimeMs: NOW - HOUR, lastActivityMs: NOW - IDLE_TIMEOUT_MS - MINUTE, rememberMe: true },
        NOW,
      ).reason,
    ).toBe(SESSION_ENDED.IDLE);
  });

  it("reports max-age expiry ahead of idleness when both apply", () => {
    const verdict = evaluateSession(
      { authTimeMs: NOW - 40 * DAY, lastActivityMs: NOW - 10 * DAY, rememberMe: true },
      NOW,
    );
    expect(verdict.reason).toBe(SESSION_ENDED.EXPIRED);
  });
});

describe("session-ended messaging", () => {
  it("gives every involuntary ending an explanation", () => {
    for (const reason of [SESSION_ENDED.EXPIRED, SESSION_ENDED.IDLE, SESSION_ENDED.REVOKED, SESSION_ENDED.INVALID]) {
      const message = sessionEndedMessage(reason);
      expect(message.length).toBeGreaterThan(0);
      // Never blame the customer for a session ending.
      expect(message).not.toMatch(/you (failed|did)/i);
    }
  });

  it("says nothing for a deliberate sign-out", () => {
    // They know they clicked it; a banner explaining it would be noise.
    expect(sessionEndedMessage(SESSION_ENDED.SIGNED_OUT)).toBe("");
  });
});
