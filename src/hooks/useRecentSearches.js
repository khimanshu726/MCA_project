import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ee_recent_searches";
const MAX_RECENT = 8;

const readStore = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch {
    // Private mode / disabled storage: recents are a convenience, never fatal.
    return [];
  }
};

/**
 * Last few search terms, persisted in localStorage. Deduplicated
 * case-insensitively and capped so the dropdown stays compact.
 */
export function useRecentSearches() {
  const [recents, setRecents] = useState(readStore);

  // Keep multiple mounted instances (and other tabs) roughly in sync.
  useEffect(() => {
    const sync = (event) => {
      if (event.key === STORAGE_KEY) setRecents(readStore());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const persist = useCallback((next) => {
    setRecents(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore write failures — the in-memory list still works this session.
    }
  }, []);

  const addRecentSearch = useCallback(
    (term) => {
      const trimmed = String(term ?? "").trim();
      if (!trimmed) return;
      setRecents((current) => {
        const withoutDuplicate = current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
        const next = [trimmed, ...withoutDuplicate].slice(0, MAX_RECENT);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // no-op
        }
        return next;
      });
    },
    [],
  );

  const clearRecentSearches = useCallback(() => persist([]), [persist]);

  return { recents, addRecentSearch, clearRecentSearches };
}
