import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { fetchCustomerOrders } from "../lib/api";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function AccountPage() {
  const { signOut, user, token } = useUserAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const loadOrders = async () => {
      try {
        const response = await fetchCustomerOrders(token);
        setOrders(response.orders || []);
      } catch (err) {
        setError("Failed to load your order history.");
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, [token]);

  const contactLabel = user?.email || user?.mobile || "Customer";
  const joinedLabel = user?.createdAt ? formatDate(user.createdAt) : "";
  const loginMethodLabel =
    user?.provider === "mobile"
      ? "Phone Number"
      : user?.provider === "facebook"
        ? "Facebook"
        : user?.provider === "google"
          ? "Google"
          : "Firebase";

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
              <Link className="primary-button" to="/cart">
                Open Cart
              </Link>
              <button type="button" className="secondary-button" onClick={signOut}>
                Logout
              </button>
            </div>
          </div>

          <div className="summary-card">
            <p className="eyebrow">Order History</p>
            
            {isLoading ? (
              <p className="section-copy">Loading your orders...</p>
            ) : error ? (
              <p className="submit-message">{error}</p>
            ) : orders.length > 0 ? (
              <div className="saved-addresses-stack">
                {orders.map((order) => (
                  <div key={order.id} className="address-card" style={{ border: "1px solid var(--border)", padding: "1.25rem", borderRadius: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <strong>{order.orderId}</strong>
                      <span style={{ fontSize: "0.875rem", color: "var(--foreground-muted)" }}>{formatDate(order.createdAt)}</span>
                    </div>
                    
                    <p className="field-helper" style={{ margin: "0.25rem 0 0.75rem 0", color: "var(--foreground)" }}>
                      {order.quantity} Items • {formatMoney(order.price)}
                    </p>
                    
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
                      <span style={{ 
                        padding: "0.25rem 0.75rem", 
                        backgroundColor: order.paymentStatus === "Paid" ? "rgba(34, 197, 94, 0.15)" : "rgba(249, 115, 22, 0.15)",
                        color: order.paymentStatus === "Paid" ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                      }}>
                        Payment: {order.paymentStatus}
                      </span>
                      <span style={{ 
                        padding: "0.25rem 0.75rem", 
                        backgroundColor: order.orderStatus === "Delivered" ? "rgba(34, 197, 94, 0.15)" : "rgba(59, 130, 246, 0.15)", 
                        color: order.orderStatus === "Delivered" ? "rgb(34, 197, 94)" : "rgb(59, 130, 246)",
                        borderRadius: "999px",
                        fontSize: "0.8rem",
                        fontWeight: "600"
                      }}>
                        Package: {order.orderStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
             ) : (
               <div className="empty-state-card" style={{ backgroundColor: "transparent", border: "1px dashed var(--border)" }}>
                 <p className="section-copy">You haven't placed any orders yet.</p>
                 <Link className="secondary-button" to="/products" style={{ marginTop: "1rem" }}>Browse Products</Link>
               </div>
             )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default AccountPage;
