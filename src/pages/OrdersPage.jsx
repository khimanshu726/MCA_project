import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import Badge from "../components/ui/Badge";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import { useOrders } from "../hooks/useOrders";

const STATUS_LABELS = { OutForDelivery: "Out for Delivery" };
const statusLabel = (status) => STATUS_LABELS[status] || status;

const STATUS_TONE = {
  Delivered: "success",
  Cancelled: "danger",
  Returned: "danger",
  Refunded: "danger",
};

const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });

function OrderRow({ order }) {
  return (
    <Link
      to={`/account/orders/${order.orderId}`}
      className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
          <Package size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-base text-ink-900">{order.orderId}</p>
          <p className="text-xs text-ink-500">
            {formatDate(order.createdAt)} &middot; {order.quantity} item{order.quantity === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <Badge tone={STATUS_TONE[order.orderStatus] || "brand"}>{statusLabel(order.orderStatus)}</Badge>
        <p className="text-sm font-semibold text-ink-900">{currencyFormatter.format(order.price || 0)}</p>
      </div>
    </Link>
  );
}

function OrdersPage() {
  const { orders, isLoading } = useOrders();

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">My Orders</p>
          <h2>Your order history.</h2>
          <p className="section-copy">Track deliveries, download invoices, and manage cancellations or returns.</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-ink-500">Loading your orders...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-8 text-center">
            <p className="text-sm text-ink-500">You haven&rsquo;t placed any orders yet.</p>
            <Link to="/products" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default OrdersPage;
