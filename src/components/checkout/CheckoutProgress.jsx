import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { step: 1, label: "Cart", path: "/cart" },
  { step: 2, label: "Address", path: "/checkout/address" },
  { step: 3, label: "Review", path: null },
  { step: 4, label: "Payment", path: null },
];

// 4-segment indicator (Cart -> Address -> Review -> Payment). Review and
// Payment share one page for COD (nothing to show on a separate "payment"
// screen) — the Razorpay modal opening *is* the Payment step for online
// payments, so step 4 never gets its own route/click target.
function CheckoutProgress({ currentStep }) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Checkout progress" className="flex items-center gap-1 sm:gap-2">
      {STEPS.map(({ step, label, path }, index) => {
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;
        const isClickable = isComplete && path;

        return (
          <div key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && navigate(path)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition sm:text-sm ${
                isCurrent
                  ? "bg-brand-500 text-white"
                  : isComplete
                    ? "text-brand-600 hover:underline disabled:no-underline"
                    : "text-ink-400"
              }`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[11px] ${
                  isCurrent
                    ? "bg-white/20 text-white"
                    : isComplete
                      ? "bg-brand-100 text-brand-600"
                      : "bg-ink-100 text-ink-400"
                }`}
              >
                {isComplete ? <Check size={12} aria-hidden="true" /> : step}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {index < STEPS.length - 1 ? (
              <span className={`h-px flex-1 ${step < currentStep ? "bg-brand-300" : "bg-ink-100"}`} aria-hidden="true" />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export default CheckoutProgress;
