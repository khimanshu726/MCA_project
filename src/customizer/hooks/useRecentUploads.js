import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ee-studio-recent-uploads";
const MAX_ITEMS = 24;

/**
 * A small library of the customer's recently uploaded artwork, so adding
 * the same logo to the back of a card doesn't mean finding the file again.
 *
 * Only entries with a server `assetUrl` are persisted: a guest's upload is
 * an object URL that dies with the tab, so writing it to localStorage would
 * resurrect a broken thumbnail on the next visit. Guests still get the list
 * in memory for the session.
 */
export function useRecentUploads({ isAuthenticated }) {
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setUploads(parsed.filter((entry) => entry?.assetUrl));
      }
    } catch {
      // Unreadable storage is not worth surfacing — start empty.
    }
  }, [isAuthenticated]);

  const persist = useCallback(
    (next) => {
      if (!isAuthenticated) {
        return;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.filter((entry) => entry.assetUrl)));
      } catch {
        // Quota — the in-memory list still works for this session.
      }
    },
    [isAuthenticated],
  );

  const rememberUpload = useCallback(
    (entry) => {
      setUploads((current) => {
        const next = [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, MAX_ITEMS);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  // Called once the asset has a durable URL; upgrades the in-memory entry
  // so it survives a reload.
  const attachAssetUrl = useCallback(
    (id, assetUrl) => {
      setUploads((current) => {
        const next = current.map((item) => (item.id === id ? { ...item, assetUrl, src: assetUrl } : item));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { uploads, rememberUpload, attachAssetUrl };
}
