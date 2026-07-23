/**
 * The single definition of "is this session still valid".
 *
 * Imported by BOTH the browser and the Node server (server/ already imports
 * from src/ - see productAvailability.js). Keep this module pure and free of
 * browser, React, or Node globals so that stays true: it is the only thing
 * guaranteeing the two sides cannot drift into disagreeing about whether a
 * customer is still logged in.
 *
 * WHY THIS EXISTS
 *
 * The current storefront requirement is straightforward: once a customer has
 * authenticated successfully, they remain signed in until they explicitly log
 * out or an admin revokes the session. This module therefore no longer
 * enforces a customer-facing session lifetime or idle timeout. It still keeps
 * the token-sanity checks that protect us from obviously invalid timestamps.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "Until logout" means the client should not auto-expire a good session.
 */
export const SESSION_MAX_AGE_MS = {
  remembered: Number.POSITIVE_INFINITY,
  default: Number.POSITIVE_INFINITY,
};

/**
 * Idle timeout is disabled for customer sessions.
 */
export const IDLE_TIMEOUT_MS = Number.POSITIVE_INFINITY;

/** Refresh the ID token this long before it expires, so requests never race it. */
export const TOKEN_REFRESH_SKEW_MS = 5 * MINUTE;

/** Distinct reasons a session ended, so the UI can say something true. */
export const SESSION_ENDED = {
  EXPIRED: "SESSION_EXPIRED",
  IDLE: "SESSION_IDLE",
  REVOKED: "SESSION_REVOKED",
  INVALID: "SESSION_INVALID",
  SIGNED_OUT: "SIGNED_OUT",
};

/** Human-facing copy. Says what happened and what to do - never blames. */
export const sessionEndedMessage = (reason) => {
  switch (reason) {
    case SESSION_ENDED.IDLE:
      return "You were signed out after a period of inactivity. Sign in to pick up where you left off.";
    case SESSION_ENDED.REVOKED:
      return "You were signed out because this account was signed out elsewhere. Sign in again to continue.";
    case SESSION_ENDED.EXPIRED:
      return "Your session has ended. Sign in again to continue.";
    case SESSION_ENDED.INVALID:
      return "We couldn't verify your session. Sign in again to continue.";
    default:
      return "";
  }
};

export const getSessionMaxAgeMs = (rememberMe) =>
  rememberMe ? SESSION_MAX_AGE_MS.remembered : SESSION_MAX_AGE_MS.default;

/**
 * Has the session outlived its maximum age?
 *
 * @param {number} authTimeMs When the user last actually authenticated, in ms
 *   since epoch. On the server this comes from the signed `auth_time` claim.
 * @param {boolean} rememberMe
 * @param {number} [now]
 */
export const isSessionMaxAgeExceeded = (authTimeMs, rememberMe, now = Date.now()) => {
  if (!Number.isFinite(authTimeMs) || authTimeMs <= 0) {
    // No usable auth_time means we cannot prove the session is fresh. Treat
    // that as expired rather than as valid - failing open here would hand an
    // unbounded session to exactly the malformed token we cannot reason about.
    return true;
  }

  // A small tolerance for clock skew between Google's clock and ours. Without
  // it, a server running slightly behind can read a token minted moments ago
  // as having been issued in the future and reject a perfectly good login.
  if (authTimeMs > now + 5 * MINUTE) {
    return true;
  }

  return now - authTimeMs > getSessionMaxAgeMs(rememberMe);
};

/** Has the user been inactive past the idle threshold? */
export const isSessionIdle = (lastActivityMs, now = Date.now()) => {
  if (!Number.isFinite(lastActivityMs) || lastActivityMs <= 0) {
    return false;
  }

  return now - lastActivityMs > IDLE_TIMEOUT_MS;
};

/**
 * The whole client-side verdict in one call.
 * @returns {{ valid: boolean, reason: string|null }}
 */
export const evaluateSession = ({ authTimeMs, lastActivityMs, rememberMe }, now = Date.now()) => {
  if (isSessionMaxAgeExceeded(authTimeMs, rememberMe, now)) {
    return { valid: false, reason: SESSION_ENDED.EXPIRED };
  }

  if (isSessionIdle(lastActivityMs, now)) {
    return { valid: false, reason: SESSION_ENDED.IDLE };
  }

  return { valid: true, reason: null };
};
