import { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";

function AddToCartButton({
  product,
  className = "secondary-button",
  idleLabel = "Add to cart",
  addedLabel = "Added",
}) {
  const { addToCart, cartItems } = useCart();
  const [isLocked, setIsLocked] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const lockTimerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const isInCart = cartItems.some((item) => item.id === product.id);

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

  const handleClick = () => {
    if (isLocked) {
      return;
    }

    addToCart(product);
    setIsLocked(true);
    setIsAdded(true);

    lockTimerRef.current = window.setTimeout(() => {
      setIsLocked(false);
    }, 700);

    feedbackTimerRef.current = window.setTimeout(() => {
      setIsAdded(false);
    }, 1600);
  };

  return (
    <button
      type="button"
      className={`${className} ${isInCart ? "in-cart-button" : ""} ${isAdded ? "added-button" : ""}`.trim()}
      onClick={handleClick}
      disabled={isLocked}
    >
      {isAdded ? addedLabel : idleLabel}
    </button>
  );
}

export default AddToCartButton;
