import { useEffect, useRef } from "react";

const DRAFT_PREFIX = "ee-studio-draft:";
const AUTOSAVE_DELAY_MS = 2500;

const draftKey = (productId) => `${DRAFT_PREFIX}${productId}`;

export function loadDraft(productId) {
  try {
    const raw = localStorage.getItem(draftKey(productId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.design ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraft(productId) {
  try {
    localStorage.removeItem(draftKey(productId));
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

const persist = (productId, design) => {
  try {
    localStorage.setItem(draftKey(productId), JSON.stringify({ design, savedAt: new Date().toISOString() }));
  } catch {
    // Quota exceeded (huge pasted images) — recovery is best-effort.
  }
};

/**
 * Debounced draft persistence: every design change lands in localStorage a
 * few seconds later, plus a synchronous flush on refresh/navigation so
 * unsaved work survives. Object-URL image sources can't outlive the page,
 * so layers are stored with their uploaded asset URL when one exists.
 */
export function useAutosave({ productId, design, isDirty, enabled = true }) {
  const timerRef = useRef(null);
  const latestRef = useRef({ productId, design, isDirty });
  latestRef.current = { productId, design, isDirty };

  useEffect(() => {
    if (!enabled || !productId || !isDirty) {
      return undefined;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(productId, design), AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [design, productId, isDirty, enabled]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const flush = () => {
      const { productId: id, design: current, isDirty: dirty } = latestRef.current;
      if (id && dirty) {
        persist(id, current);
      }
    };

    window.addEventListener("beforeunload", flush);
    return () => {
      flush();
      window.removeEventListener("beforeunload", flush);
    };
  }, [enabled]);
}
