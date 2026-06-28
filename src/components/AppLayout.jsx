import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { categoryMenu, navigationLinks, promoMessage, utilityLinks } from "../data";

function AppLayout() {
  const { cartCount } = useCart();
  const { isAuthenticated, signOut } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const customerLabel = isAuthenticated ? "My Account" : "Login";
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchTerm(params.get("q") ?? "");
  }, [location.search]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();

    if (trimmedSearch) {
      params.set("q", trimmedSearch);
    }

    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="app-shell">
      <div className="promo-strip">
        <p>{promoMessage}</p>
        <Link className="promo-link" to="/products">
          Explore all categories
        </Link>
      </div>

      <header className="site-header">
        <div className="header-utility-row">
          <div className="utility-stack">
            {utilityLinks.map((item) => (
              <span key={item.label} className="utility-pill">
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            ))}
          </div>

          <div className="account-actions">
            <NavLink to={isAuthenticated ? "/account" : "/login"} className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}>
              {customerLabel}
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => `nav-link utility-link ${isActive ? "active" : ""}`}>
              Cart
              <span className="nav-count">{cartCount}</span>
            </NavLink>
            {isAuthenticated ? (
              <button type="button" className="nav-link nav-button utility-link" onClick={signOut}>
                Logout
              </button>
            ) : null}
          </div>
        </div>

        <div className="header-main-row">
          <div className="brand-block">
            <p className="eyebrow">Online print store</p>
            <h1>Elite Empressions</h1>
            <p className="brand-copy">Business cards, marketing print, packaging, merchandise, and customization tools for growing brands.</p>
          </div>

          <form className="header-search" onSubmit={handleSearchSubmit}>
            <label className="search-label" htmlFor="store-search">
              Search products
            </label>
            <div className="search-field-row">
              <input
                id="store-search"
                type="search"
                placeholder="Search cards, flyers, banners, mugs..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button type="submit" className="primary-button search-submit">
                Search
              </button>
            </div>
          </form>
        </div>

        <div className="header-nav-row">
          <nav className="site-nav" aria-label="Primary">
            {navigationLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <nav className="category-nav" aria-label="Category shortcuts">
            {categoryMenu.map((item) => (
              <Link key={item.label} className="category-link" to={`/products?category=${encodeURIComponent(item.category)}`}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}

export default AppLayout;
