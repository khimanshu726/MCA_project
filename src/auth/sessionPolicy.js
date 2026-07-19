/**
 * The single definition of "is this session still valid".
 *
 * Imported by BOTH the browser and the Node server (server/ already imports
 * from src/ — see productAvailability.js). Keep this module pure and free of
 * browser, React, or Node globals so that stays true: it is the only thing
 * guaranteeing the two sides can't drift into disagreeing about whether a
 * customer is still logged in.
 *
 * WHY THIS EXISTS
 *
 * Firebase refresh tokens do not expire. Combined with browserLocalPersistence
 * that produced the reported bug exactly: sign in once with Google and you are
 * authenticated forever, on that device, until someone clears site data. No
 * shopping site behaves that way.
 *
 * The fix has two independent layers, deliberately:
 *
 *   1. PERSISTENCE decides whether the credential outlives the browser. Not
 *      remembered -> session persistence, so Firebase never writes the refresh
 *      token to disk and closing the browser genuinely ends the session. This
 *      is enforced by not storing the credential at all, which no client-side
 *      timer can be tricked into skipping.
 *
 *   2. MAX AGE decides how long any session may live, and is enforced on the
 *      SERVER against the `auth_time` claim inside the signed ID token.
 *      auth_time is the moment the user actually proved who they were; it
 *      survives token refreshes, is signed by Google, and cannot be edited by
 *      the client. A tampered clock or a patched bundle does not extend it.
 *
 * Idle timeout is the one rule that is genuinely client-side, because only the
 * client can observe input. It is a courtesy (walk away from a shared laptop),
 * not a security boundary — the server's max-age check is the boundary.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long a session may live from the moment of authentication, before the
 * user must prove who they are again.
 *
 * The remembered window is capped at 30 days rather than left open: it is the
 * ceiling an attacker holding a stolen refresh token inherits, so "forever" is
 * not an option even when the customer asked to be remembered.
 */
export const SESSION_MAX_AGE_MS = {
  remembered: 30 * DAY,
  default: 12 * HOUR,
};

/**
 * Inactivity before we ask for re-authentication.
 *
 * Deliberately not aggressive. A customer comparing products in another tab,
 * reading reviews, or measuring a wall for a banner is not idle in any sense
 * that should cost them their basket. Banks use 15 minutes; shops do not.
 */
export const IDLE_TIMEOUT_MS = 2 * HOUR;

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

/** Human-facing copy. Says what happened and what to do — never blames. */
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
    // that as expired rather than as valid — failing open here would hand an
    // unbounded session to exactly the malformed token we can't reason about.
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
