import AddToCartButton from "./AddToCartButton";
import { currencyFormatter } from "./ui/PriceDisplay";

/**
 * Phone-only sticky bar on the product page: the line total for the chosen
 * quantity and "Add to cart", one tap away however far the shopper scrolls.
 * The product page shows it only while its own buy buttons are off screen, so
 * the same button is never on screen twice. Hidden above 900px by CSS
 * (.mobile-buy-bar), where the buy panel sits beside the gallery.
 */
function MobileBuyBar({ product, quantity, unitPrice, isVisible }) {
  return (
    <div
      className={`mobile-buy-bar ${isVisible ? "is-visible" : ""}`}
      aria-hidden={isVisible ? undefined : "true"}
      inert={!isVisible}
      data-testid="mobile-buy-bar"
    >
      <div className="mobile-buy-bar-inner">
        <div className="min-w-0">
          <p className="mobile-buy-bar-label">
            {quantity} × {currencyFormatter.format(unitPrice)}
          </p>
          <p className="mobile-buy-bar-total">{currencyFormatter.format(unitPrice * quantity)}</p>
        </div>
        <AddToCartButton product={product} quantity={quantity} variant="primary" size="lg" className="mobile-buy-bar-button" />
      </div>
    </div>
  );
}

export default MobileBuyBar;
