import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Tracks whether the window has been scrolled past the top edge.
 * Used to add an elevated shadow to the sticky site header.
 */
export function useScrolled(threshold = 8) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return isScrolled;
}

/**
 * True while the visitor is scrolling DOWN past `offset` px, false as soon as
 * they scroll up (or are back near the top). Drives the phone header's
 * hide-on-scroll: on a 375px screen the full header is ~180px, so keeping it
 * pinned the whole time covered about a third of the page. Small movements
 * under `tolerance` px are ignored so the header doesn't flicker on jitter.
 */
export function useHideOnScroll({ offset = 160, tolerance = 8 } = {}) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y <= offset) {
        setIsHidden(false);
      } else if (y - lastY > tolerance) {
        setIsHidden(true);
      } else if (lastY - y > tolerance) {
        setIsHidden(false);
      } else {
        return; // within tolerance: keep lastY so slow scrolls still add up
      }
      lastY = y;
    };

    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [offset, tolerance]);

  return isHidden;
}

/**
 * Reads/writes the `?q=` search parameter and exposes a submit helper that
 * routes to `/products?q=…`.
 */
export function useHeaderSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get("q") ?? "");
  }, [location.search]);

  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const trimmed = searchTerm.trim();
    if (trimmed) params.set("q", trimmed);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return { searchTerm, setSearchTerm, submit };
}

/**
 * Mobile menu open/close state that auto-closes when the route changes.
 */
export function useMobileMenu() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggle = () => setMobileOpen((current) => !current);
  const close = () => setMobileOpen(false);

  return { mobileOpen, toggle, close };
}
