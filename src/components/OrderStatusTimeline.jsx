import { Check } from "lucide-react";
import Badge from "./ui/Badge";

const TIMELINE_STEPS = ["Placed", "Confirmed", "Packed", "Shipped", "OutForDelivery", "Delivered"];
const TERMINAL_STATUSES = ["Cancelled", "Returned", "Refunded"];
const STATUS_LABELS = { OutForDelivery: "Out for Delivery" };
const statusLabel = (status) => STATUS_LABELS[status] || status;

const formatTimestamp = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

// Cancelled/Returned/Refunded render as a distinct terminal state rather
// than a step on the linear Placed -> Delivered timeline — an order that
// was cancelled didn't pass "through" every step on its way there.
function OrderStatusTimeline({ order }) {
  const isTerminal = TERMINAL_STATUSES.includes(order.orderStatus);
  const historyByStatus = new Map((order.statusHistory || []).map((entry) => [entry.status, entry.changedAt]));

  if (isTerminal) {
    return (
      <div className="rounded-2xl border border-danger-100 bg-danger-100/10 p-4">
        <Badge tone="danger">{statusLabel(order.orderStatus)}</Badge>
        {historyByStatus.get(order.orderStatus) ? (
          <p className="mt-2 text-xs text-ink-500">{formatTimestamp(historyByStatus.get(order.orderStatus))}</p>
        ) : null}
      </div>
    );
  }

  const currentIndex = TIMELINE_STEPS.indexOf(order.orderStatus);

  return (
    <ol>
      {TIMELINE_STEPS.map((step, index) => {
        const isDone = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const timestamp = historyByStatus.get(step);
        const isLast = index === TIMELINE_STEPS.length - 1;

        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  isDone ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-400"
                }`}
              >
                {isDone ? <Check size={13} aria-hidden="true" /> : index + 1}
              </span>
              {!isLast ? (
                <span className={`min-h-6 w-px flex-1 ${index < currentIndex ? "bg-brand-300" : "bg-ink-100"}`} aria-hidden="true" />
              ) : null}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-medium ${isCurrent ? "text-brand-600" : isDone ? "text-ink-900" : "text-ink-400"}`}>
                {statusLabel(step)}
              </p>
              {timestamp ? <p className="text-xs text-ink-400">{formatTimestamp(timestamp)}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default OrderStatusTimeline;
