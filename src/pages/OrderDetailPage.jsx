import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Mail, RotateCcw, ShoppingBag, XCircle } from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Dialog from "../components/ui/Dialog";
import Toast from "../components/ui/Toast";
import ResponsiveImage from "../components/ResponsiveImage";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import { useOrder } from "../hooks/useOrder";
import { useCart } from "../hooks/useCart";
import { useToast } from "../hooks/useToast";

const SUPPORT_EMAIL = "hello@elite-empressions.com";
const CANCELLABLE_STATUSES = ["Placed", "Confirmed"];
const RETURNABLE_STATUSES = ["Delivered"];

function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { order, isLoading, cancelOrder, isCancelling, returnOrder, isReturning } = useOrder(orderId);
  const { addToCart } = useCart();
  const { toast, pushToast, dismiss } = useToast();

  const [confirmAction, setConfirmAction] = useState(null); // "cancel" | "return" | null
  const [actionMessage, setActionMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  if (isLoading) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <div className="flex items-center justify-center py-24 text-sm text-ink-500">Loading order...</div>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-8 text-center">
            <p className="text-sm text-ink-500">We couldn&rsquo;t find that order.</p>
            <Link to="/account/orders" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">
              Back to orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.includes(order.orderStatus);
  const canReturn = RETURNABLE_STATUSES.includes(order.orderStatus);

  const handleConfirmAction = async () => {
    try {
      if (confirmAction === "cancel") {
        await cancelOrder();
        pushToast({ type: "success", message: "Order cancelled." });
      } else if (confirmAction === "return") {
        await returnOrder();
        pushToast({ type: "success", message: "Return requested." });
      }
      setActionMessage("");
    } catch (error) {
      setActionMessage(error.payload?.message || error.message || "Something went wrong.");
    } finally {
      setConfirmAction(null);
    }
  };

  const handleReorder = async () => {
    await Promise.all(
      (order.lineItems || []).map((item) =>
        addToCart({ id: item.productId, name: item.name, price: item.unitPrice }, item.quantity),
      ),
    );
    pushToast({ type: "success", message: "Items added to your cart." });
    navigate("/cart");
  };

  const handleDownloadInvoice = async () => {
    setIsDownloading(true);
    try {
      const { generateInvoicePdf } = await import("../utils/generateInvoice");
      await generateInvoicePdf(order);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="page-stack">
      <Toast toast={toast} onDismiss={dismiss} />

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">
            <Link to="/account/orders" className="hover:underline">
              My Orders
            </Link>{" "}
            / {order.orderId}
          </p>
          <h2>{order.orderId}</h2>
          <p className="section-copy">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <h3 className="mb-3 font-display text-lg text-ink-900">Status</h3>
              <OrderStatusTimeline order={order} />
              {order.trackingId ? (
                <p className="mt-2 text-sm text-ink-600">
                  Tracking ID: <span className="font-semibold">{order.trackingId}</span>
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <h3 className="mb-3 font-display text-lg text-ink-900">Items ({(order.lineItems || []).length})</h3>
              <div className="flex flex-col gap-2">
                {(order.lineItems || []).map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                      <ResponsiveImage alt={item.name} aspectClassName="ratio-square" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">{item.name}</p>
                      <p className="text-xs text-ink-500">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{currencyFormatter.format(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
              <h3 className="mb-3 font-display text-lg text-ink-900">Delivery address</h3>
              <div className="text-sm text-ink-700">
                <p className="font-medium text-ink-900">{order.customerName}</p>
                <p>{order.phone}</p>
                <p>
                  {order.address?.street}
                  {order.address?.landmark ? `, ${order.address.landmark}` : ""}
                </p>
                <p>
                  {order.address?.city}, {order.address?.state} - {order.address?.pincode}
                </p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">Payment</span>
                <Badge tone={order.paymentStatus === "Paid" ? "success" : "neutral"}>{order.paymentStatus}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
                <span className="font-display text-lg text-ink-900">Total</span>
                <span className="font-display text-xl text-ink-900">{currencyFormatter.format(order.price || 0)}</span>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <Button variant="secondary" onClick={handleDownloadInvoice} loading={isDownloading}>
                  <Download size={16} aria-hidden="true" /> Download Invoice
                </Button>
                <Button variant="secondary" onClick={handleReorder}>
                  <ShoppingBag size={16} aria-hidden="true" /> Buy Again
                </Button>
                {canCancel ? (
                  <Button variant="danger" onClick={() => setConfirmAction("cancel")} loading={isCancelling}>
                    <XCircle size={16} aria-hidden="true" /> Cancel Order
                  </Button>
                ) : null}
                {canReturn ? (
                  <Button variant="secondary" onClick={() => setConfirmAction("return")} loading={isReturning}>
                    <RotateCcw size={16} aria-hidden="true" /> Return Order
                  </Button>
                ) : null}
                <Button as="a" variant="ghost" href={`mailto:${SUPPORT_EMAIL}?subject=Order ${order.orderId}`}>
                  <Mail size={16} aria-hidden="true" /> Contact Support
                </Button>
              </div>

              {actionMessage ? <p className="mt-3 text-xs text-danger-600">{actionMessage}</p> : null}
            </div>
          </aside>
        </div>
      </section>

      <Dialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "cancel" ? "Cancel this order?" : "Request a return?"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>
              Never mind
            </Button>
            <Button variant="danger" onClick={handleConfirmAction} loading={isCancelling || isReturning}>
              {confirmAction === "cancel" ? "Cancel Order" : "Request Return"}
            </Button>
          </>
        }
      >
        {confirmAction === "cancel"
          ? "This will cancel your order and restore the items to stock. This can't be undone."
          : "We'll start the return process for this delivered order."}
      </Dialog>
    </main>
  );
}

export default OrderDetailPage;
