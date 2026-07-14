import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, PackageCheck, Truck } from "lucide-react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import ResponsiveImage from "../components/ResponsiveImage";
import { currencyFormatter } from "../components/ui/PriceDisplay";
import { useUserAuth } from "../context/UserAuthContext";
import { useProducts } from "../hooks/useProducts";
import { getCustomerOrder } from "../api/ordersApi";

function OrderSuccessPage() {
  const { orderId: orderIdParam } = useParams();
  const location = useLocation();
  const { token } = useUserAuth();

  const [order, setOrder] = useState(location.state?.order || null);
  const [isLoading, setIsLoading] = useState(!location.state?.order && Boolean(orderIdParam));
  const [fetchFailed, setFetchFailed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // On a fresh checkout the order arrives via router state (no round trip
  // needed). On a refresh — or if someone lands here from a saved link —
  // state is gone, so fall back to fetching it by id.
  useEffect(() => {
    if (order || !orderIdParam) return;

    let isActive = true;
    setIsLoading(true);
    getCustomerOrder(orderIdParam, token)
      .then((data) => {
        if (isActive) setOrder(data.order);
      })
      .catch(() => {
        if (isActive) setFetchFailed(true);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [order, orderIdParam, token]);

  const lineItemProductIds = useMemo(() => (order?.lineItems || []).map((item) => item.productId), [order]);
  const { data: liveProductsData } = useProducts({ ids: lineItemProductIds });
  const productsById = useMemo(() => {
    const map = new Map();
    (liveProductsData?.items ?? []).forEach((product) => map.set(product.id, product));
    return map;
  }, [liveProductsData]);

  const deliveryEstimate = useMemo(() => {
    const leadTimes = lineItemProductIds.map((id) => productsById.get(id)?.leadTime).filter(Boolean);
    return leadTimes[0] || null;
  }, [lineItemProductIds, productsById]);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setIsDownloading(true);
    try {
      const { generateInvoicePdf } = await import("../utils/generateInvoice");
      await generateInvoicePdf(order);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <div className="flex items-center justify-center py-24 text-sm text-ink-500">Loading your order...</div>
        </section>
      </main>
    );
  }

  if (!order || fetchFailed) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-100">
            <CheckCircle2 size={40} className="text-success-600" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-2xl text-ink-900">Your order is confirmed!</h2>
          <p className="mt-1 text-sm text-ink-500">
            We've received your order and will start processing it shortly.
          </p>

          <div className="mt-6 w-full rounded-2xl border border-ink-100 bg-white p-5 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Order ID</p>
                <p className="font-display text-lg text-ink-900">{order.orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total</p>
                <p className="font-display text-lg text-ink-900">{currencyFormatter.format(order.price || 0)}</p>
              </div>
            </div>

            {deliveryEstimate ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-100/40 px-3 py-2 text-sm text-brand-700">
                <Truck size={16} aria-hidden="true" />
                {deliveryEstimate}
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
              <PackageCheck size={16} className="text-ink-400" aria-hidden="true" />
              Payment: {order.paymentStatus} &middot; Status: {order.orderStatus}
            </div>

            <div className="mt-5 flex flex-col gap-2 border-t border-ink-100 pt-4">
              {(order.lineItems || []).map((item) => {
                const product = productsById.get(item.productId);
                return (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-50">
                      <ResponsiveImage src={product?.images?.[0]} alt={item.name} aspectClassName="ratio-square" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-medium text-ink-900">{item.name}</p>
                      <p className="text-xs text-ink-500">Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-ink-900">{currencyFormatter.format(item.totalPrice)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button as={Link} to="/products" variant="secondary">
              Continue Shopping
            </Button>
            <Button as={Link} to="/account/orders">
              Go to Orders
            </Button>
            <Button variant="ghost" onClick={handleDownloadInvoice} loading={isDownloading}>
              <Download size={16} aria-hidden="true" /> Download Invoice
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default OrderSuccessPage;
