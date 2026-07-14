export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function PriceDisplay({ price, mrp, discountPercent = 0, size = "md", showSavings = false, quantity = 1 }) {
  const hasDiscount = Boolean(mrp && mrp > price);
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`font-semibold text-ink-900 ${sizeClass}`}>{currencyFormatter.format(price)}</span>
      {hasDiscount ? (
        <>
          <span className="text-sm text-ink-400 line-through">{currencyFormatter.format(mrp)}</span>
          <span className="text-sm font-semibold text-success-600">{discountPercent}% off</span>
        </>
      ) : null}
      {showSavings && hasDiscount ? (
        <span className="w-full text-xs text-success-600">
          You save {currencyFormatter.format((mrp - price) * quantity)}
        </span>
      ) : null}
    </div>
  );
}

export default PriceDisplay;
