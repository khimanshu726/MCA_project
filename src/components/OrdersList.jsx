import { Link } from "react-router-dom";

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

const badgeStyle = (isPositive) => ({
  padding: "0.25rem 0.75rem",
  backgroundColor: isPositive ? "rgba(34, 197, 94, 0.15)" : "rgba(249, 115, 22, 0.15)",
  color: isPositive ? "rgb(34, 197, 94)" : "rgb(249, 115, 22)",
  borderRadius: "999px",
  fontSize: "0.8rem",
  fontWeight: 600,
});

function OrderCard({ order }) {
  return (
    <div className="address-card" style={{ padding: "1.25rem", borderRadius: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <strong>{order.orderId}</strong>
        <span style={{ fontSize: "0.875rem", color: "var(--ink-500)" }}>{formatDate(order.createdAt)}</span>
      </div>
      <p className="field-helper" style={{ margin: "0.25rem 0 0.75rem 0" }}>
        {order.quantity} Items • {formatMoney(order.price)}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
        <span style={badgeStyle(order.paymentStatus === "Paid")}>
          Payment: {order.paymentStatus}
        </span>
        <span style={badgeStyle(order.orderStatus === "Delivered")}>
          Package: {order.orderStatus}
        </span>
      </div>
    </div>
  );
}

function OrdersList({ orders, isLoading, error }) {
  if (isLoading) {
    return <p className="section-copy">Loading your orders&hellip;</p>;
  }

  if (error) {
    return <p className="submit-message">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="empty-state-card" style={{ backgroundColor: "transparent" }}>
        <p className="section-copy">You haven&rsquo;t placed any orders yet.</p>
        <Link className="secondary-button" to="/products" style={{ marginTop: "1rem" }}>
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="saved-addresses-stack">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

export default OrdersList;
