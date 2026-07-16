import { useEffect, useRef, useState } from "react";
import { useCart } from "../hooks/useCart";
import { getMinimumOrderQty, isProductOutOfStock } from "../utils/productAvailability";

/**
 * The one control that puts a product in the cart, from anywhere.
 *
 * It used to have no idea whether the product was buyable: the button was
 * always enabled, so an out-of-stock product could be added, reported
 * "Added", and then sat in the cart priced at zero with checkout blocked.
 * Availability now comes from the same predicate the cart and the server use.
 */
function AddToCartButton({
  product,
  className = "secondary-button",
  idleLabel = "Add to cart",
  addedLabel = "Added",
}) {
  const { addToCart, cartItemIds } = useCart();
  const [isLocked, setIsLocked] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState("");
  const lockTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const isInCart = cartItemIds.has(product.id);
  const isOutOfStock = isProductOutOfStock(product);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) {
        window.clearTimeout(lockTimerRef.current);
      }

      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    if (isLocked || isOutOfStock) {
      return;
    }

    setIsLocked(true);
    setError("");

    try {
      // Awaited: the authenticated path is a server round-trip, and an
      // unawaited rejection used to be swallowed while the button still
      // claimed "Added".
      await addToCart(product, getMinimumOrderQty(product));
      setIsAdded(true);
      feedbackTimerRef.current = window.setTimeout(() => setIsAdded(false), 1600);
    } catch {
      setError("Couldn't add. Try again.");
    } finally {
      lockTimerRef.current = window.setTimeout(() => setIsLocked(false), 700);
    }
  };

  if (isOutOfStock) {
    return (
      <button type="button" className={className} disabled aria-disabled="true">
        Out of stock
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${className} ${isInCart ? "in-cart-button" : ""} ${isAdded ? "added-button" : ""}`.trim()}
      onClick={handleClick}
      disabled={isLocked}
    >
      {error || (isAdded ? addedLabel : idleLabel)}
    </button>
  );
}

export default AddToCartButton;
