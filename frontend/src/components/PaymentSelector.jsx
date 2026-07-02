const OPTIONS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
];

function PaymentSelector({ paymentMethod, onChange }) {
  return (
    <div className="summary-card">
      <p className="eyebrow">Payment</p>
      <div className="payment-options">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`payment-option ${paymentMethod === option.value ? "active" : ""}`}
          >
            <input
              type="radio"
              name="payment"
              value={option.value}
              checked={paymentMethod === option.value}
              onChange={(event) => onChange(event.target.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default PaymentSelector;
