import { useEffect, useRef } from "react";

/**
 * Unsaved form work kept in this browser, so it survives a sign-in expiring
 * (the expiry signs the admin out and removes the page), a refresh, or a
 * closed tab. Storage problems (private mode, full storage) only mean no
 * draft; they never break the form.
 */
export const loadDraft = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveDraft = (key, data) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // No draft this time; the form itself is unaffected.
  }
};

export const clearDraft = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
};

/**
 * Keeps `value` saved under `key` while `shouldKeep` is true (and removes it
 * when false; `null` leaves any saved draft untouched, e.g. before it has been
 * restored): shortly after each change, and at once when the page goes away
 * (unmount, closing the tab, switching away), so the last keystrokes before a
 * sign-in expiry are never lost.
 */
export function useFormDraft(key, value, shouldKeep, delayMs = 400) {
  const latest = useRef({ value, shouldKeep });
  latest.current = { value, shouldKeep };

  const flush = useRef(() => {});
  flush.current = () => {
    const { value: current, shouldKeep: keep } = latest.current;
    if (keep === null) return;
    if (keep) saveDraft(key, { ...current, savedAt: new Date().toISOString() });
    else clearDraft(key);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => flush.current(), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, shouldKeep, delayMs]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush.current();
    };
    const onUnload = () => flush.current();
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onHide);
      // The page is going away (e.g. signed out by an expired session).
      flush.current();
    };
  }, []);
}
