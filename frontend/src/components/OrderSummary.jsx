import { Link } from "react-router-dom";

function OrderSummary({
  selectedAddress,
  subtotal,
  shipping,
  total,
  formatMoney,
  orderMessage,
  orderReceipt,
  canPlaceOrder,
  placeOrderDisabledReason,
  isPlacingOrder,
  onPlaceOrder,
}) {
  return (
    <div className="summary-card">
      <p className="eyebrow">Order summary</p>

      {selectedAddress ? (
        <div className="selected-address-inline">
          <strong>Deliver to:</strong>
          <span>{selectedAddress.fullName}</span>
          <span>{selectedAddress.email}</span>
          <span>{selectedAddress.phoneNumber}</span>
          <span>
            {selectedAddress.address}
            {selectedAddress.landmark ? `, ${selectedAddress.landmark}` : ""}
          </span>
          <span>
            {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.postalCode}
          </span>
        </div>
      ) : null}

      <div className="summary-line">
        <span>Subtotal</span>
        <strong>{formatMoney(subtotal)}</strong>
      </div>
      <div className="summary-line">
        <span>Shipping</span>
        <strong>{formatMoney(shipping)}</strong>
      </div>
      <div className="summary-line total-line">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>

      {orderMessage ? <p className="submit-message">{orderMessage}</p> : null}

      {orderReceipt ? (
        <div className="order-success-card">
          <strong>{orderReceipt.orderId}</strong>
          <span>Status: {orderReceipt.orderStatus}</span>
          <span>Payment: {orderReceipt.paymentStatus}</span>
        </div>
      ) : null}

      <div className="action-row">
        <button
          type="button"
          className="primary-button full-width-button"
          onClick={onPlaceOrder}
          disabled={!canPlaceOrder}
        >
          {isPlacingOrder ? "Placing Order..." : "Place Order"}
        </button>
        {!canPlaceOrder && placeOrderDisabledReason ? (
          <p className="field-helper">{placeOrderDisabledReason}</p>
        ) : null}
        <Link className="secondary-button full-width-button" to="/customize">
          Edit Designs
        </Link>
      </div>
    </div>
  );
}

export default OrderSummary;
