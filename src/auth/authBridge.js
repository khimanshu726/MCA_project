/**
 * A narrow seam between the API layer and the auth provider.
 *
 * `request()` in lib/api.js is a module-level function, but recovering from a
 * 401 needs two things only React state can supply: a freshly minted token,
 * and somewhere to report that the session is over. Threading those through
 * all twelve API functions and every call site would mean touching sixteen
 * files to fix one behaviour.
 *
 * So the provider registers its handlers here once at mount, and the API layer
 * reaches for them when a request comes back unauthorized. Two functions, one
 * direction, no React import — the API layer stays framework-agnostic and the
 * auth logic stays in one place.
 */

let handlers = {
  getFreshToken: null,
  onSessionEnded: null,
};

/** Called once by the auth provider on mount. */
export const registerAuthHandlers = ({ getFreshToken, onSessionEnded }) => {
  handlers = { getFreshToken, onSessionEnded };

  return () => {
    handlers = { getFreshToken: null, onSessionEnded: null };
  };
};

/**
 * Force-mints a new ID token. Returns null when nobody is signed in, or when
 * the refresh itself fails — which is the signal that the session is truly
 * gone rather than merely stale.
 */
export const requestFreshToken = async () => {
  if (!handlers.getFreshToken) {
    return null;
  }

  try {
    return await handlers.getFreshToken();
  } catch {
    return null;
  }
};

/**
 * Reports that the session has ended and cannot be recovered. The provider
 * decides what that means (sign out, clear caches, redirect); this module
 * deliberately knows none of it.
 */
export const notifySessionEnded = (reason) => {
  handlers.onSessionEnded?.(reason);
};
