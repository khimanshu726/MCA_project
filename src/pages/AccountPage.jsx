import { Link, Navigate } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";

function AccountPage() {
  const { isAuthenticated, signOut, user } = useUserAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const contactLabel = user?.email || user?.mobile || "Customer";
  const joinedLabel = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "";

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">My Account</p>
          <h2>Welcome back to Elite Empressions.</h2>
          <p className="section-copy">Your customer session is active, so you can move through the cart and checkout flow without signing in again.</p>
        </div>

        <div className="account-grid">
          <div className="summary-card">
            <p className="eyebrow">Profile</p>
            <div className="account-detail-list">
              <div className="summary-line">
                <span>Signed in as</span>
                <strong>{contactLabel}</strong>
              </div>
              <div className="summary-line">
                <span>Login method</span>
                <strong>{user?.provider === "mobile" ? "Phone Number" : "Email"}</strong>
              </div>
              {joinedLabel ? (
                <div className="summary-line">
                  <span>Joined</span>
                  <strong>{joinedLabel}</strong>
                </div>
              ) : null}
            </div>

            <div className="action-row">
              <Link className="primary-button" to="/cart">
                Continue to Cart
              </Link>
              <button type="button" className="secondary-button" onClick={signOut}>
                Logout
              </button>
            </div>
          </div>

          <div className="summary-card">
            <p className="eyebrow">Quick actions</p>
            <p className="section-copy">Browse products, customize a design, or go straight to checkout with your saved customer session.</p>
            <div className="action-row">
              <Link className="mini-link" to="/products">
                Browse Products
              </Link>
              <Link className="mini-link" to="/customize">
                Customize Design
              </Link>
              <Link className="mini-link" to="/cart">
                Open Cart
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AccountPage;
