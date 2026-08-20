import { Link } from "react-router-dom";
import ResponsiveImage from "../ResponsiveImage";
import AddToCartButton from "../AddToCartButton";
import { currencyFormatter } from "../ui/PriceDisplay";

/**
 * Compact product tile for the cart recommendation rails (Amazon "also bought"
 * strip). Fixed narrow width so several fit in a horizontal scroll; the whole
 * tile links to the product, with a small add-to-cart underneath so recs stay
 * actionable without the full product card's height.
 */
function ProductRailCard({ product }) {
  return (
    <div className="w-[150px] shrink-0 snap-start">
      <Link to={`/products/${product.id}`} className="group block">
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <ResponsiveImage
            src={product.images?.[0]}
            alt={product.name}
            aspectClassName="ratio-square"
            className="transition-transform duration-500 group-hover:scale-105"
            width={160}
          />
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-snug text-ink-800">{product.name}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink-900">{currencyFormatter.format(product.price)}</p>
      </Link>
      <AddToCartButton
        product={product}
        variant="secondary"
        size="sm"
        className="mt-2 w-full"
        idleLabel="Add"
        addedLabel="Added"
      />
    </div>
  );
}

export default ProductRailCard;
