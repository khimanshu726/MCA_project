import { NavLink, Outlet } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { navigationLinks } from "../data";

function AppLayout() {
  const { cartCount } = useCart();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand-block">
          <p className="eyebrow">Image-ready storefront</p>
          <h1>Inkwell Press</h1>
          <p className="brand-copy">Print products, gallery previews, and upload-based customization in one React app.</p>
        </div>

        <nav className="site-nav" aria-label="Primary">
          {navigationLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              {link.label}
              {link.to === "/cart" ? <span className="nav-count">{cartCount}</span> : null}
            </NavLink>
          ))}
        </nav>
      </header>

      <Outlet />
    </div>
  );
}

export default AppLayout;
