import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ASSET_BASE_URL, deleteOrder, fetchOrder, fetchOrders, updateOrder } from "../lib/api";
import { useAdminAuth } from "../context/AdminAuthContext";

const statusOptions = ["All", "New", "Processing", "Completed", "Cancelled"];
const orderCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const formatMoney = (value) => orderCurrency.format(value || 0);

const buildFileLink = (uploadedFileURL) => {
  if (!uploadedFileURL) {
    return "";
  }

  if (/^https?:\/\//i.test(uploadedFileURL)) {
    return uploadedFileURL;
  }

  return `${API_ASSET_BASE_URL}${uploadedFileURL}`;
};

function AdminOrdersPage() {
  const { token } = useAdminAuth();
  const [filters, setFilters] = useState({
    status: "All",
    date: "",
    query: "",
  });
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadOrders = useCallback(
    async (preferredOrderId) => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetchOrders(token, {
          status: filters.status === "All" ? "" : filters.status,
          date: filters.date,
          query: filters.query,
        });

        setOrders(response.orders);
        setSelectedOrderId(preferredOrderId || response.orders[0]?.id || "");
      } catch (loadError) {
        setError(loadError.message || "Unable to load orders.");
      } finally {
        setIsLoading(false);
      }
    },
    [filters.date, filters.query, filters.status, token],
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const loadSelectedOrder = async () => {
      if (!selectedOrderId) {
        setSelectedOrder(null);
        return;
      }

      setIsDetailLoading(true);

      try {
        const response = await fetchOrder(selectedOrderId, token);
        setSelectedOrder(response.order);

        if (response.order.notificationStatus === "Unread") {
          const updateResponse = await updateOrder(
            selectedOrderId,
            { notificationStatus: "Seen" },
            token,
          );
          setSelectedOrder(updateResponse.order);
          setOrders((currentOrders) =>
            currentOrders.map((order) => (order.id === selectedOrderId ? updateResponse.order : order)),
          );
        }
      } catch (loadError) {
        setError(loadError.message || "Unable to load the order details.");
      } finally {
        setIsDetailLoading(false);
      }
    };

    loadSelectedOrder();
  }, [selectedOrderId, token]);

  const unreadCount = useMemo(
    () => orders.filter((order) => order.notificationStatus === "Unread").length,
    [orders],
  );

  const totalRevenue = useMemo(
    () => orders.reduce((total, order) => total + (order.price || 0), 0),
    [orders],
  );

  const handleStatusUpdate = async (nextStatus) => {
    if (!selectedOrder) {
      return;
    }

    setActionMessage("");

    try {
      const response = await updateOrder(
        selectedOrder.id,
        {
          orderStatus: nextStatus,
          notificationStatus: "Seen",
        },
        token,
      );

      setSelectedOrder(response.order);
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === response.order.id ? response.order : order)),
      );
      setActionMessage(`Order moved to ${nextStatus}.`);
    } catch (updateError) {
      setActionMessage(updateError.message || "Unable to update the order.");
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder || !window.confirm(`Delete order ${selectedOrder.orderId}?`)) {
      return;
    }

    try {
      await deleteOrder(selectedOrder.id, token);
      setActionMessage("Order deleted.");
      setSelectedOrder(null);
      setSelectedOrderId("");
      await loadOrders();
    } catch (deleteError) {
      setActionMessage(deleteError.message || "Unable to delete the order.");
    }
  };

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Dashboard</p>
          <h2>Track new jobs, payment state, and production progress in one place.</h2>
        </div>

        <div className="admin-metrics-grid">
          <article className="summary-card">
            <p className="eyebrow">Unread</p>
            <strong className="dashboard-metric">{unreadCount}</strong>
            <p className="section-copy">Orders still highlighted as new in the queue.</p>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Orders</p>
            <strong className="dashboard-metric">{orders.length}</strong>
            <p className="section-copy">Orders matching your current filters.</p>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Revenue</p>
            <strong className="dashboard-metric">{formatMoney(totalRevenue)}</strong>
            <p className="section-copy">Total booked value across visible orders.</p>
          </article>
        </div>
      </section>

      <section className="section-panel admin-dashboard-layout">
        <div className="admin-orders-column">
          <div className="delivery-form-card admin-filters-grid">
            <div className="input-field">
              <label className="field-label strong-label" htmlFor="status-filter">
                Order Status
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-field">
              <label className="field-label strong-label" htmlFor="date-filter">
                Order Date
              </label>
              <input
                id="date-filter"
                type="date"
                value={filters.date}
                onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
              />
            </div>

            <div className="input-field full-span">
              <label className="field-label strong-label" htmlFor="search-filter">
                Search
              </label>
              <input
                id="search-filter"
                type="text"
                placeholder="Search by order ID, customer, email, or product"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              />
            </div>
          </div>

          <div className="orders-table-shell">
            {isLoading ? (
              <div className="summary-card">
                <p className="section-copy">Loading orders...</p>
              </div>
            ) : orders.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`${selectedOrderId === order.id ? "selected-row" : ""} ${
                        order.notificationStatus === "Unread" ? "unread-row" : ""
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td>
                        <strong>{order.orderId}</strong>
                        <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                      </td>
                      <td>
                        <strong>{order.customerName}</strong>
                        <span>{order.phone}</span>
                      </td>
                      <td>{order.productName}</td>
                      <td>{formatMoney(order.price)}</td>
                      <td>
                        <span className={`status-badge status-${order.orderStatus.toLowerCase()}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="summary-card">
                <p className="section-copy">No orders match the current filters yet.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="checkout-column">
          <div className="summary-card">
            <p className="eyebrow">Order detail</p>
            {isDetailLoading ? (
              <p className="section-copy">Loading the selected order...</p>
            ) : selectedOrder ? (
              <div className="order-detail-stack">
                <div className="order-detail-block">
                  <strong>{selectedOrder.orderId}</strong>
                  <span>{new Date(selectedOrder.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <div className="order-detail-block">
                  <span className={`status-badge status-${selectedOrder.orderStatus.toLowerCase()}`}>
                    {selectedOrder.orderStatus}
                  </span>
                  <span className={`status-badge status-${selectedOrder.paymentStatus.toLowerCase()}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
                <div className="order-detail-block">
                  <strong>{selectedOrder.customerName}</strong>
                  <span>{selectedOrder.phone}</span>
                  <span>{selectedOrder.email}</span>
                </div>
                <div className="order-detail-block">
                  <strong>Delivery address</strong>
                  <span>
                    {selectedOrder.address.street}
                    {selectedOrder.address.landmark ? `, ${selectedOrder.address.landmark}` : ""}
                  </span>
                  <span>
                    {selectedOrder.address.city}, {selectedOrder.address.state} - {selectedOrder.address.pincode}
                  </span>
                </div>
                <div className="order-detail-block">
                  <strong>Line items</strong>
                  {selectedOrder.lineItems.map((item) => (
                    <span key={item.productId}>
                      {item.name} x {item.quantity} ({formatMoney(item.totalPrice)})
                    </span>
                  ))}
                </div>
                <div className="order-detail-block">
                  <strong>Customization</strong>
                  <span>{selectedOrder.customizationDetails || "No special instructions provided."}</span>
                </div>
                {selectedOrder.uploadedFileURL ? (
                  <div className="order-detail-block">
                    <strong>Design file</strong>
                    <a
                      className="mini-link"
                      href={buildFileLink(selectedOrder.uploadedFileURL)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download upload
                    </a>
                  </div>
                ) : null}
                <div className="order-detail-block">
                  <strong>Total</strong>
                  <span>Shipping: {formatMoney(selectedOrder.shippingCharge || 0)}</span>
                  <span>{formatMoney(selectedOrder.price)}</span>
                </div>
                <div className="action-row">
                  <button type="button" className="secondary-button" onClick={() => handleStatusUpdate("Processing")}>
                    Mark Processing
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleStatusUpdate("Completed")}>
                    Mark Completed
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleStatusUpdate("Cancelled")}>
                    Cancel Order
                  </button>
                  <button type="button" className="secondary-button danger-button" onClick={handleDeleteOrder}>
                    Delete Order
                  </button>
                </div>
                {actionMessage ? <p className="submit-message">{actionMessage}</p> : null}
              </div>
            ) : (
              <p className="section-copy">Select an order from the table to inspect and manage it.</p>
            )}
          </div>

          {error ? (
            <div className="summary-card">
              <p className="field-error">{error}</p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default AdminOrdersPage;
