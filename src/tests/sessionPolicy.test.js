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

  it("does not auto-expire a long-lived session anymore", () => {
    const authTime = NOW - 13 * HOUR;
    expect(isSessionMaxAgeExceeded(authTime, false, NOW)).toBe(false);
    expect(isSessionMaxAgeExceeded(authTime, true, NOW)).toBe(false);
  });

  it("allows even very old sessions to remain valid until logout", () => {
    expect(isSessionMaxAgeExceeded(NOW - 29 * DAY, true, NOW)).toBe(false);
    expect(isSessionMaxAgeExceeded(NOW - 365 * DAY, true, NOW)).toBe(false);
  });

  it("treats a missing or nonsensical auth time as expired, never as valid", () => {
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
    expect(isSessionMaxAgeExceeded(NOW + 60 * 1000, true, NOW)).toBe(false);
  });

  it("exposes the two windows", () => {
    expect(getSessionMaxAgeMs(true)).toBe(SESSION_MAX_AGE_MS.remembered);
    expect(getSessionMaxAgeMs(false)).toBe(SESSION_MAX_AGE_MS.default);
    expect(SESSION_MAX_AGE_MS.remembered).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("idle timeout", () => {
  it("does not consider recent activity idle", () => {
    expect(isSessionIdle(NOW - 5 * MINUTE, NOW)).toBe(false);
  });

  it("does not sign out an inactive customer automatically", () => {
    expect(isSessionIdle(NOW - 30 * DAY, NOW)).toBe(false);
  });

  it("does not interrupt long-running browsing sessions", () => {
    expect(isSessionIdle(NOW - 1 * HOUR, NOW)).toBe(false);
    expect(isSessionIdle(NOW - 7 * DAY, NOW)).toBe(false);
  });

  it("treats an unknown last-activity as active, not idle", () => {
    expect(isSessionIdle(undefined, NOW)).toBe(false);
    expect(isSessionIdle(0, NOW)).toBe(false);
  });

  it("exports an infinite idle window", () => {
    expect(IDLE_TIMEOUT_MS).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("evaluateSession", () => {
  it("passes a fresh, active, remembered session", () => {
    expect(
      evaluateSession({ authTimeMs: NOW - HOUR, lastActivityMs: NOW - MINUTE, rememberMe: true }, NOW),
    ).toEqual({ valid: true, reason: null });
  });

  it("still rejects obviously invalid auth timestamps", () => {
    expect(
      evaluateSession({ authTimeMs: NOW + 10 * MINUTE, lastActivityMs: NOW, rememberMe: true }, NOW).reason,
    ).toBe(SESSION_ENDED.EXPIRED);
  });

  it("treats otherwise valid sessions as active even after long gaps", () => {
    const verdict = evaluateSession(
      { authTimeMs: NOW - 40 * DAY, lastActivityMs: NOW - 10 * DAY, rememberMe: true },
      NOW,
    );
    expect(verdict).toEqual({ valid: true, reason: null });
  });
});

describe("session-ended messaging", () => {
  it("gives every involuntary ending an explanation", () => {
    for (const reason of [SESSION_ENDED.EXPIRED, SESSION_ENDED.IDLE, SESSION_ENDED.REVOKED, SESSION_ENDED.INVALID]) {
      const message = sessionEndedMessage(reason);
      expect(message.length).toBeGreaterThan(0);
      expect(message).not.toMatch(/you (failed|did)/i);
    }
  });

  it("says nothing for a deliberate sign-out", () => {
    expect(sessionEndedMessage(SESSION_ENDED.SIGNED_OUT)).toBe("");
  });
});
