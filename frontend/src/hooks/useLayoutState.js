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

  return { mobileOpen, toggle };
}
