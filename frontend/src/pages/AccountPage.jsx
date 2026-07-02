import { Link } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { useCustomerOrders } from "../hooks/useCustomerOrders";
import OrdersList from "../components/OrdersList";

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const PROVIDER_LABELS = {
  mobile: "Phone Number",
  facebook: "Facebook",
  google: "Google",
};

function AccountPage() {
  const { signOut, user, token } = useUserAuth();
  const { orders, isLoading, error } = useCustomerOrders(token);

  const contactLabel = user?.email || user?.mobile || "Customer";
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

          <div className="summary-card">
            <p className="eyebrow">Order History</p>
            <OrdersList orders={orders} isLoading={isLoading} error={error} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default AccountPage;
