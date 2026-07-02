import { Link, Navigate, useLocation } from "react-router-dom";

function OrderSuccessPage() {
  const location = useLocation();
  const order = location.state?.order || null;

  if (!order) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Payment Successful</p>
          <h2>Your order is confirmed and queued for production.</h2>
          <p className="section-copy">We have received your order and will start processing it shortly.</p>
        </div>

        <div className="summary-card order-success-hero">
          <strong className="order-success-id">{order.orderId}</strong>
          <div className="order-success-meta">
            <span>Payment: {order.paymentStatus}</span>
            <span>Status: {order.orderStatus}</span>
            <span>Total: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.price || 0)}</span>
          </div>
          <div className="action-row">
            <Link className="primary-button" to="/">
              Continue Shopping
            </Link>
            <Link className="secondary-button" to="/account">
              View Orders
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default OrderSuccessPage;

