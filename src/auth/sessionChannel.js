/**
 * Cross-tab session synchronization.
 *
 * Firebase already propagates sign-in state between tabs when persistence is
 * local, but it does not when persistence is session-scoped, and it says
 * nothing about WHY a session ended. A tab that finds itself signed out has no
 * way to tell "you logged out in the other tab" from "your session expired",
 * and so cannot show the right message or route sensibly.
 *
 * BroadcastChannel carries that intent between tabs directly. The storage
 * event is kept as a fallback for browsers without it (older Safari), where a
 * same-origin write is the only cross-tab signal available.
 */

const CHANNEL_NAME = "ee-auth";
const FALLBACK_KEY = "ee-auth-broadcast";

const hasBroadcastChannel = typeof BroadcastChannel !== "undefined";

let channel = null;

const getChannel = () => {
  if (!hasBroadcastChannel) return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
};

/** Tells every other tab that the session ended, and why. */
export const broadcastSessionEnded = (reason) => {
  const message = { type: "session-ended", reason, at: Date.now() };

  const bc = getChannel();
  if (bc) {
    bc.postMessage(message);
    return;
  }

  try {
    // The value must differ each time or the storage event won't fire for a
    // repeat of the same reason.
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(message));
  } catch {
    // Storage unavailable: other tabs will notice at their next request.
  }
};

/** Tells every other tab that somebody signed in, so they can rehydrate. */
export const broadcastSignedIn = () => {
  const message = { type: "signed-in", at: Date.now() };

  const bc = getChannel();
  if (bc) {
    bc.postMessage(message);
    return;
  }

  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(message));
  } catch {
    // As above.
  }
};

/**
 * @param {{ onSessionEnded: (reason: string) => void, onSignedIn: () => void }} listeners
 * @returns {() => void} unsubscribe
 */
export const subscribeToSessionEvents = ({ onSessionEnded, onSignedIn }) => {
  const handleMessage = (data) => {
    if (!data || typeof data !== "object") return;
    if (data.type === "session-ended") onSessionEnded(data.reason);
    if (data.type === "signed-in") onSignedIn();
  };

  const bc = getChannel();

  if (bc) {
    const listener = (event) => handleMessage(event.data);
    bc.addEventListener("message", listener);
    return () => bc.removeEventListener("message", listener);
  }

  const storageListener = (event) => {
    if (event.key !== FALLBACK_KEY || !event.newValue) return;
    try {
      handleMessage(JSON.parse(event.newValue));
    } catch {
      // Ignore a malformed payload rather than tearing down a live session.
    }
  };

  window.addEventListener("storage", storageListener);
  return () => window.removeEventListener("storage", storageListener);
};
