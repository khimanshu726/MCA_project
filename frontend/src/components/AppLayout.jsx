import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, User, LogOut, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { categoryMenu, navigationLinks, promoMessage } from "../data";
import SiteFooter from "./SiteFooter";

function AppLayout() {
  const { cartCount } = useCart();
  const { isAuthenticated, signOut } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get("q") ?? "");
  }, [location.search]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) params.set("q", trimmedSearch);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="app-shell">
      <div className="promo-strip" role="region" aria-label="Promotion">
        <p>{promoMessage}</p>
        <Link className="promo-link" to="/products">
          Explore all categories
        </Link>
      </div>

      <header className={`site-header ${isScrolled ? "is-scrolled" : ""}`}>
        <div className="header-main-row">
          <Link to="/" className="brand-block" aria-label="Elite Empressions home">
            <h1>Elite Empressions</h1>
          </Link>

          <form className="header-search" onSubmit={handleSearchSubmit} role="search">
            <label className="search-label" htmlFor="store-search">Search products</label>
            <div className="search-field-row">
              <input
                id="store-search"
                type="search"
                placeholder="Search cards, flyers, banners, mugs…"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search products"
              />
              <button type="submit" className="primary-button search-submit">Search</button>
            </div>
          </form>

          <div className="account-actions">
            <NavLink
              to={isAuthenticated ? "/account" : "/login"}
              className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}
              aria-label={isAuthenticated ? "My account" : "Log in"}
            >
              <User size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="hide-mobile">{isAuthenticated ? "Account" : "Login"}</span>
            </NavLink>
            <NavLink
              to="/cart"
              className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}
              aria-label={`Cart with ${cartCount} items`}
            >
              <ShoppingBag size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="hide-mobile">Cart</span>
              <span className="nav-count">{cartCount}</span>
            </NavLink>
            {isAuthenticated ? (
              <button
                type="button"
                className="nav-link nav-button utility-link hide-mobile"
                onClick={signOut}
                aria-label="Log out"
              >
                <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              className="nav-link nav-button utility-link show-mobile"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
            </button>
          </div>
        </div>

        <div className={`header-nav-row ${mobileOpen ? "is-open" : ""}`}>
          <nav className="site-nav" aria-label="Primary navigation">
            {navigationLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <nav className="category-nav" aria-label="Category shortcuts">
            {categoryMenu.map((item) => (
              <Link
                key={item.label}
                className="category-link"
                to={`/products?category=${encodeURIComponent(item.category)}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <Outlet />

      <SiteFooter />
    </div>
  );
}

export default AppLayout;
