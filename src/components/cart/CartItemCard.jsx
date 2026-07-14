import { Link } from "react-router-dom";
import { AlertTriangle, Bookmark, BookmarkCheck, PackageX, Trash2 } from "lucide-react";
import ResponsiveImage from "../ResponsiveImage";
import Badge from "../ui/Badge";
import PriceDisplay, { currencyFormatter } from "../ui/PriceDisplay";
import QuantitySelector from "../ui/QuantitySelector";

function CartItemCard({ item, selected, onToggleSelect, onQuantityChange, onRemove, onToggleSaveForLater, isAuthenticated }) {
  const { product, quantity, isOutOfStock, isLowStock, isPriceChanged, isMissing, savedForLater, priceAtAdd } = item;

  if (isMissing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-4 text-sm text-ink-500">
        <PackageX size={18} className="text-ink-400" aria-hidden="true" />
        <span className="flex-1">This product is no longer available.</span>
        <button
          type="button"
          className="text-sm font-semibold text-danger-600 hover:underline"
          onClick={() => onRemove(item.productId)}
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-xs transition sm:flex-row sm:items-start sm:p-5 ${
        isOutOfStock ? "border-danger-100 bg-danger-100/20" : "border-ink-100"
      }`}
    >
      {!savedForLater ? (
        <label className="flex items-start pt-1 sm:pt-0">
          <span className="sr-only">Select {product.name}</span>
          <input
            type="checkbox"
            className="size-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
            checked={selected}
            onChange={() => onToggleSelect(item.productId)}
            disabled={isOutOfStock}
          />
        </label>
      ) : (
        <div className="hidden w-4 sm:block" aria-hidden="true" />
      )}

      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-50 sm:h-28 sm:w-28">
        <ResponsiveImage src={product.images?.[0]} alt={product.name} aspectClassName="ratio-square" />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{product.category}</p>
            <Link to={`/products/${product.id}`} className="font-display text-lg text-ink-900 hover:text-brand-600">
              {product.name}
            </Link>
          </div>
          <PriceDisplay price={product.price} mrp={product.mrp} discountPercent={product.discountPercent} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {product.leadTime ? <Badge tone="neutral">{product.leadTime}</Badge> : null}
          {product.minimumOrderQty ? <Badge tone="neutral">MOQ {product.minimumOrderQty}</Badge> : null}
          {isOutOfStock ? (
            <Badge tone="danger">
              <AlertTriangle size={12} /> Out of stock
            </Badge>
          ) : isLowStock ? (
            <Badge tone="warning">Only {product.stock} left</Badge>
          ) : (
            <Badge tone="success">In stock</Badge>
          )}
        </div>

        {isPriceChanged && !isOutOfStock ? (
          <div className="flex items-center gap-2 rounded-lg bg-gold-500/10 px-3 py-2 text-xs text-ink-700">
            <AlertTriangle size={14} className="text-gold-500 shrink-0" aria-hidden="true" />
            Price changed from {currencyFormatter.format(priceAtAdd)} to {currencyFormatter.format(product.price)} since you
            added it.
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <QuantitySelector
            value={quantity}
            min={product.minimumOrderQty || 1}
            max={Math.max(product.stock, 1)}
            disabled={isOutOfStock || savedForLater}
            ariaLabel={`Quantity for ${product.name}`}
            onChange={(next) => onQuantityChange(item.productId, next)}
          />

          <div className="flex items-center gap-4 text-sm">
            {isAuthenticated ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-ink-600 hover:text-brand-600"
                onClick={() => onToggleSaveForLater(item.productId, !savedForLater)}
              >
                {savedForLater ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                {savedForLater ? "Move to cart" : "Save for later"}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-danger-600 hover:text-danger-700"
              onClick={() => onRemove(item.productId)}
            >
              <Trash2 size={15} />
              Remove
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CartItemCard;
