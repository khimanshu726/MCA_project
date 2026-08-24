import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ListSkeleton from "../components/ui/ListSkeleton";
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
          <ListSkeleton count={3} rowClassName="h-[76px]" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, it'll show up here so you can track it, download an invoice, or reorder."
            action={
              <Button as={Link} to="/products">
                Browse products
              </Button>
            }
          />
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
