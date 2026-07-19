import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import Button from "./ui/Button";
import { useUserAuth } from "../context/UserAuthContext";
import { getDefaultOrderQty, isProductOutOfStock } from "../utils/productAvailability";
import { storeBuyNowSession } from "../utils/buyNowSession";

/**
 * Instant single-item purchase: skips the cart entirely and opens checkout on
 * just this product.
 *
 * Deliberately does NOT call addToCart. The customer's cart is theirs; a Buy
 * Now that wrote into it and cleaned up afterwards would corrupt it on every
 * abandoned checkout, failed payment, or closed tab.
 */
function BuyNowButton({
  product,
  quantity,
  customization = null,
  className = "",
  label = "Buy Now",
  size = "md",
  onUnavailable,
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useUserAuth();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  // Guards the window between click and route change. Without it, a double
  // click fires two navigations and (on a slow device) two session writes.
  const isNavigatingRef = useRef(false);

  const isOutOfStock = isProductOutOfStock(product);
  const resolvedQuantity = quantity ?? getDefaultOrderQty(product);

  const handleClick = () => {
    if (isNavigatingRef.current || isOutOfStock) {
      return;
    }

    isNavigatingRef.current = true;
    setIsStarting(true);
    setError("");

    const session = storeBuyNowSession({
      productId: product.id,
      quantity: resolvedQuantity,
      customization,
      unitPriceAtStart: product.price,
    });

    // Storage refused the write (private mode, quota). Proceeding would put
    // the customer into a checkout that a single refresh would empty, so stop
    // here and say so rather than failing halfway through payment.
    if (!session) {
      isNavigatingRef.current = false;
      setIsStarting(false);
      const message = "Couldn't start checkout in this browser. Add to cart instead.";
      setError(message);
      onUnavailable?.(message);
      return;
    }

    if (!isAuthenticated) {
      // The session is already persisted, so the customer returns to a fully
      // intact checkout — quantity and customization included — rather than
      // back to the product page to start over.
      navigate("/login", { state: { from: "/checkout/address" } });
      return;
    }

    navigate("/checkout/address");
  };

  if (isOutOfStock) {
    return (
      <Button type="button" variant="primary" size={size} className={className} disabled>
        Out of stock
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size={size}
        className={className}
        onClick={handleClick}
        loading={isStarting}
        aria-label={`Buy ${product.name} now`}
      >
        {!isStarting ? <Zap size={16} aria-hidden="true" /> : null}
        {label}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      ) : null}
    </>
  );
}

export default BuyNowButton;
