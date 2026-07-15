import { Banknote, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Wallet } from "lucide-react";

// Every non-COD method opens the same Razorpay Checkout, which presents the
// full method list itself — the selection here records the customer's
// intent and decides COD vs online. Methods map to backend
// allowedPaymentMethods (server/utils/orderHelpers.js).
const OPTIONS = [
  { value: "upi", label: "UPI", detail: "Google Pay, PhonePe, BHIM", icon: Smartphone },
  { value: "card", label: "Credit / Debit Card", detail: "Visa, Mastercard, RuPay, Amex", icon: CreditCard },
  { value: "netbanking", label: "Net Banking", detail: "All major Indian banks", icon: Landmark },
  { value: "wallet", label: "Wallet", detail: "Mobikwik, Freecharge & more", icon: Wallet },
  { value: "cod", label: "Cash on Delivery", detail: "Pay when your order arrives", icon: Banknote },
];

function PaymentSelector({ paymentMethod, onChange }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Payment</p>

      <div role="radiogroup" aria-label="Payment method" className="mt-3 flex flex-col gap-2">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = paymentMethod === option.value;

          return (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                isActive ? "border-brand-400 bg-brand-50/60 ring-1 ring-brand-400/30" : "border-ink-200 hover:border-brand-300"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={option.value}
                checked={isActive}
                onChange={(event) => onChange(event.target.value)}
                className="size-4 border-ink-300 text-brand-500 focus:ring-brand-500"
              />
              <Icon size={18} className={isActive ? "text-brand-600" : "text-ink-400"} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-900">{option.label}</span>
                <span className="block truncate text-xs text-ink-500">{option.detail}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-ink-100 pt-3 text-xs text-ink-500">
        <span className="flex items-center gap-2">
          <ShieldCheck size={14} className="shrink-0 text-sage-500" aria-hidden="true" />
          100% secure payments, powered by Razorpay
        </span>
        <span className="flex items-center gap-2">
          <Lock size={14} className="shrink-0 text-sage-500" aria-hidden="true" />
          256-bit SSL encrypted &mdash; card details never touch our servers
        </span>
      </div>
    </div>
  );
}

export default PaymentSelector;
