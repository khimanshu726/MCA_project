import { useCallback, useEffect, useMemo, useState } from "react";
import { API_ASSET_BASE_URL, deleteOrder, fetchOrder, fetchOrders, updateOrder, bulkUpdateOrders } from "../lib/api";
import { useAdminAuth } from "../context/AdminAuthContext";

const statusOptions = ["All", "New", "Processing", "Completed", "Cancelled"];
const allowedPaymentStatuses = ["Pending", "Paid", "Refunded", "Failed"];

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

const exportToCSV = (orders) => {
  if (!orders || orders.length === 0) return;

  const headers = ["Order ID", "Date", "Customer", "Email", "Phone", "Products", "Qty", "Total", "Order Status", "Payment Status", "City", "State"];
  
  const csvRows = [headers.join(",")];
  
  for (const order of orders) {
    const row = [
      order.orderId,
      new Date(order.createdAt).toLocaleDateString("en-IN"),
      `"${order.customerName}"`,
      order.email || "",
      order.phone,
      `"${order.productName}"`,
      order.quantity,
      order.price,
      order.orderStatus,
      order.paymentStatus,
      `"${order.address?.city || ""}"`,
      `"${order.address?.state || ""}"`,
    ];
    csvRows.push(row.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `elite_orders_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function AdminOrdersPage() {
  const { token } = useAdminAuth();
  const [filters, setFilters] = useState({
    status: "All",
    date: "",
    query: "",
  });
  const [orders, setOrders] = useState([]);
  
  const [selectedBulkIds, setSelectedBulkIds] = useState([]);
  
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
        setSelectedBulkIds([]);
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
    if (!selectedOrder) return;
    setActionMessage("");
    try {
      const response = await updateOrder(
        selectedOrder.id,
        { orderStatus: nextStatus, notificationStatus: "Seen" },
        token,
      );
      setSelectedOrder(response.order);
      setOrders((current) => current.map((order) => (order.id === response.order.id ? response.order : order)));
      setActionMessage(`Order moved to ${nextStatus}.`);
    } catch (updateError) {
      setActionMessage(updateError.message || "Unable to update the order.");
    }
  };

  const handlePaymentStatusUpdate = async (nextStatus) => {
    if (!selectedOrder) return;
    setActionMessage("");
    try {
      const response = await updateOrder(
        selectedOrder.id,
        { paymentStatus: nextStatus, notificationStatus: "Seen" },
        token,
      );
      setSelectedOrder(response.order);
      setOrders((current) => current.map((order) => (order.id === response.order.id ? response.order : order)));
      setActionMessage(`Payment manually set to ${nextStatus}.`);
    } catch (updateError) {
      setActionMessage(updateError.message || "Unable to update the payment.");
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder || !window.confirm(`Delete order ${selectedOrder.orderId}?`)) return;
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

  const handleBulkAction = async (action, status) => {
    if (selectedBulkIds.length === 0) return;
    const confirmMessage = action === "delete" 
        ? `Warning: Delete ${selectedBulkIds.length} orders permanently?` 
        : `Mark ${selectedBulkIds.length} orders as ${status}?`;
        
    if (!window.confirm(confirmMessage)) return;

    try {
      setActionMessage("Processing bulk operation...");
      await bulkUpdateOrders({
        orderIds: selectedBulkIds,
        action,
        status
      }, token);
      
      setActionMessage(`Bulk ${action} successful.`);
      setSelectedBulkIds([]);
      await loadOrders(selectedOrderId);
    } catch (err) {
      setActionMessage(err.message || "Bulk operation failed.");
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBulkIds(orders.map(o => o.id));
    } else {
      setSelectedBulkIds([]);
    }
  };

  const toggleSelectOrder = (id) => {
    setSelectedBulkIds(current => 
      current.includes(id) ? current.filter(i => i !== id) : [...current, id]
    );
  };

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
            <div className="section-heading" style={{ margin: 0 }}>
            <p className="eyebrow">Dashboard</p>
            <h2>Track new jobs, payment state, and production progress in one place.</h2>
            </div>
            <button type="button" onClick={() => exportToCSV(orders)} className="secondary-button" style={{ height: "fit-content" }}>
                Export CSV
            </button>
        </div>

        <div className="admin-metrics-grid" style={{ marginTop: "1.5rem" }}>
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
              <label className="field-label strong-label" htmlFor="status-filter">Order Status</label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="input-field">
              <label className="field-label strong-label" htmlFor="date-filter">Order Date</label>
              <input
                id="date-filter"
                type="date"
                value={filters.date}
                onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
              />
            </div>

            <div className="input-field full-span">
              <label className="field-label strong-label" htmlFor="search-filter">Search</label>
              <input
                id="search-filter"
                type="text"
                placeholder="Search by order ID, customer, email, or product"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              />
            </div>
          </div>

          <div className="orders-table-shell" style={{ position: "relative" }}>
            {selectedBulkIds.length > 0 && (
              <div style={{ padding: "0.75rem 1rem", backgroundColor: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "1rem", position: "sticky", top: 0, zIndex: 10 }}>
                <strong style={{ fontSize: "0.875rem" }}>{selectedBulkIds.length} selected</strong>
                <button type="button" className="mini-link" onClick={() => handleBulkAction("updateStatus", "Processing")}>Mark Processing</button>
                <button type="button" className="mini-link" onClick={() => handleBulkAction("updateStatus", "Completed")}>Mark Completed</button>
                <button type="button" className="mini-link danger" style={{ color: "red" }} onClick={() => handleBulkAction("delete")}>Bulk Delete</button>
              </div>
            )}

            {isLoading ? (
              <div className="summary-card">
                <p className="section-copy">Loading orders...</p>
              </div>
            ) : orders.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedBulkIds.length === orders.length && orders.length > 0} 
                        onChange={toggleSelectAll} 
                      />
                    </th>
                    <th>Order</th>
                    <th>Customer</th>
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
                      <td onClick={(e) => e.stopPropagation()}>
                         <input 
                            type="checkbox" 
                            checked={selectedBulkIds.includes(order.id)} 
                            onChange={() => toggleSelectOrder(order.id)} 
                        />
                      </td>
                      <td>
                        <strong>{order.orderId}</strong>
                        <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                      </td>
                      <td>
                        <strong>{order.customerName}</strong>
                        <span>{order.phone}</span>
                      </td>
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
                
                <div className="order-detail-block" style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
                  <span className={`status-badge status-${selectedOrder.orderStatus.toLowerCase()}`}>
                    Package: {selectedOrder.orderStatus}
                  </span>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className={`status-badge status-${selectedOrder.paymentStatus.toLowerCase()}`}>
                        Payment: {selectedOrder.paymentStatus}
                    </span>
                    <select 
                        value={selectedOrder.paymentStatus}
                        onChange={(e) => handlePaymentStatusUpdate(e.target.value)}
                        style={{ padding: "0.15rem", fontSize: "0.75rem", borderRadius: "4px" }}
                    >
                        {allowedPaymentStatuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                  </div>
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
