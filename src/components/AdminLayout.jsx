import { NavLink, Outlet } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

function AdminLayout() {
  const { admin, signOut } = useAdminAuth();

  return (
    <div className="app-shell admin-shell">
      <header className="site-header admin-header">
        <div className="brand-block">
          <p className="eyebrow">Admin panel</p>
          <h1>Order Management</h1>
          <p className="brand-copy">Signed in as {admin?.email || admin?.mobile || "Admin"}.</p>
        </div>

        <nav className="site-nav" aria-label="Admin">
          <NavLink to="/admin/orders" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Orders
          </NavLink>
          <NavLink to="/" className="nav-link">
            Storefront
          </NavLink>
          <button type="button" className="secondary-button compact-button" onClick={signOut}>
            Logout
          </button>
        </nav>
      </header>

      <Outlet />
    </div>
  );
}

export default AdminLayout;
