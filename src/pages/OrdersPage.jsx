import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import ResponsiveImage from "../components/ResponsiveImage";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import ListSkeleton from "../components/ui/ListSkeleton";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import { useOrders } from "../hooks/useOrders";
import { useProducts } from "../hooks/useProducts";

const MAX_THUMBNAILS = 3;

// The lines of an order, normalised. Orders store each line's name and
// quantity (so names survive even if a product is later removed from the
// catalog). Very old orders predate `lineItems` and only carry the flattened
// `productName` / `quantity` fields, so fall back to those.
const orderLines = (order) => {
  if (Array.isArray(order.lineItems) && order.lineItems.length > 0) {
    return order.lineItems.map((item) => ({ productId: item.productId, name: item.name, quantity: item.quantity }));
  }
  return [{ productId: null, name: order.productName || "Order", quantity: order.quantity }];
};

// "Classic Visiting Card × 100" or "Classic Visiting Card × 100 + 2 more".
// Quantities are units (100 cards), which the old "100 items" label misstated.
export const orderSummary = (order) => {
  const lines = orderLines(order);
  const [first] = lines;
  const head = first.quantity ? `${first.name} × ${first.quantity}` : first.name;
  const title = lines.length > 1 ? `${head} + ${lines.length - 1} more` : head;
  return { title, lines };
};

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

// Up to three overlapping item thumbnails, then a "+N" chip. Images come from
// the live product (orders don't store them); a line whose product isn't in the
// catalog any more shows the box icon instead.
function OrderThumbnails({ lines, productsById }) {
  const shown = lines.slice(0, MAX_THUMBNAILS);
  const hiddenCount = lines.length - shown.length;

  return (
    <div className="flex shrink-0 -space-x-3" aria-hidden="true">
      {shown.map((line, index) => {
        const image = line.productId ? productsById.get(line.productId)?.images?.[0] : null;
        return (
          <span
            key={`${line.productId || "line"}-${index}`}
            data-testid="order-thumbnail"
            className="flex size-11 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-ink-50 text-ink-400"
          >
            {image ? (
              <ResponsiveImage src={image} alt="" aspectClassName="ratio-square" width={48} />
            ) : (
              <Package size={20} />
            )}
          </span>
        );
      })}
      {hiddenCount > 0 ? (
        <span className="flex size-11 items-center justify-center rounded-xl border-2 border-white bg-ink-100 text-xs font-semibold text-ink-600">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  );
}

function OrderRow({ order, productsById }) {
  const { title, lines } = orderSummary(order);

  return (
    <Link
      to={`/account/orders/${order.orderId}`}
      aria-label={`Order ${order.orderId}: ${title}`}
      className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 transition hover:border-brand-300 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-center gap-3">
        <OrderThumbnails lines={lines} productsById={productsById} />
        <div className="min-w-0">
          <p className="truncate font-display text-base text-ink-900">{title}</p>
          <p className="text-xs text-ink-500">
            {order.orderId} &middot; {formatDate(order.createdAt)}
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

  // One product request for every order's thumbnails, not one per order.
  const productIds = useMemo(
    () => [...new Set(orders.flatMap((order) => orderLines(order).map((line) => line.productId)).filter(Boolean))],
    [orders],
  );
  const { data: productsData } = useProducts({ ids: productIds, limit: productIds.length });
  const productsById = useMemo(() => {
    const map = new Map();
    (productsData?.items ?? []).forEach((product) => map.set(product.id, product));
    return map;
  }, [productsData]);

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
              <OrderRow key={order.id} order={order} productsById={productsById} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default OrdersPage;
