import { useCallback, useRef } from "react";

// Matches the breakpoint in admin.css where `.admin-dashboard-layout` stops
// being table-beside-panel and stacks the panel underneath the list.
export const STACKED_LAYOUT_QUERY = "(max-width: 1080px)";

const matches = (query) => typeof window !== "undefined" && Boolean(window.matchMedia?.(query).matches);

/**
 * Once the layout stacks (tablets and phones), the edit form or order detail
 * sits below a long list: tapping a row changed it far off-screen, so it
 * looked like nothing happened. This brings the panel into view after a row is
 * picked, and gives the panel a way back to the list.
 *
 * Side by side (desktop) both are already visible, so nothing scrolls.
 * Both targets need tabIndex={-1} so focus can follow the scroll.
 */
export function useStackedReveal() {
  const panelRef = useRef(null);
  const listRef = useRef(null);

  const reveal = useCallback((element) => {
    if (!element || !matches(STACKED_LAYOUT_QUERY)) {
      return;
    }
    element.scrollIntoView({
      behavior: matches("(prefers-reduced-motion: reduce)") ? "auto" : "smooth",
      block: "start",
    });
    element.focus({ preventScroll: true });
  }, []);

  const revealPanel = useCallback(() => reveal(panelRef.current), [reveal]);
  const revealList = useCallback(() => reveal(listRef.current), [reveal]);

  return { panelRef, listRef, revealPanel, revealList };
}

/** Lets a clickable table row open with Enter or Space, not just a mouse. */
export const rowKeyHandler = (open) => (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    open();
  }
};
