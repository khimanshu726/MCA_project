import { Link } from "react-router-dom";
import { PackageSearch } from "lucide-react";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import { useUserAuth } from "../context/UserAuthContext";
import { useOrders } from "../hooks/useOrders";

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const PROVIDER_LABELS = {
  email: "Email & Password",
  mobile: "Phone Number",
  facebook: "Facebook",
  google: "Google",
};

function AccountPage() {
  const { authUser, refreshProfile, signOut, user } = useUserAuth();
  const { orders } = useOrders();

  const accountName = user?.displayName || authUser?.displayName || user?.email || user?.mobile || "Customer";
  const contactLabel = user?.email || authUser?.email || user?.mobile || "Customer";
  const joinedLabel = user?.createdAt ? formatDate(user.createdAt) : "";
  const loginMethodLabel = PROVIDER_LABELS[user?.provider] || "Firebase";

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">User Dashboard</p>
          <h2>Welcome back to Elite Empressions.</h2>
          <p className="section-copy">Manage your profile and track all your previous orders natively.</p>
        </div>

        <EmailVerificationBanner authUser={authUser} refreshProfile={refreshProfile} />

        <div className="account-grid">
          <div className="summary-card">
            <p className="eyebrow">Profile</p>
            <div className="account-detail-list">
              <div className="summary-line">
                <span>Account name</span>
                <strong>{accountName}</strong>
              </div>
              <div className="summary-line">
                <span>Signed in as</span>
                <strong>{contactLabel}</strong>
              </div>
              <div className="summary-line">
                <span>Login method</span>
                <strong>{loginMethodLabel}</strong>
              </div>
              {joinedLabel ? (
                <div className="summary-line">
                  <span>Joined</span>
                  <strong>{joinedLabel}</strong>
                </div>
              ) : null}
            </div>

            <div className="action-row" style={{ marginTop: "1.5rem" }}>
              <Link className="primary-button" to="/cart">Open Cart</Link>
              <button type="button" className="secondary-button" onClick={signOut}>Logout</button>
            </div>
          </div>

          <Link to="/account/orders" className="summary-card" style={{ display: "block", textDecoration: "none" }}>
            <p className="eyebrow">Order History</p>
            <div className="account-detail-list">
              <div className="summary-line">
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <PackageSearch size={16} aria-hidden="true" /> Total orders
                </span>
                <strong>{orders.length}</strong>
              </div>
            </div>
            <p className="field-helper" style={{ marginTop: "0.75rem" }}>
              View, track, cancel, or return your orders &rarr;
            </p>
          </Link>

          <Link to="/account/designs" className="summary-card" style={{ display: "block", textDecoration: "none" }}>
            <p className="eyebrow">My Designs</p>
            <p className="field-helper" style={{ marginTop: "0.75rem" }}>
              Saved customizations — reopen, duplicate, or reorder them &rarr;
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AccountPage;
