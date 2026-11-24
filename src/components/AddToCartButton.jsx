import { useEffect, useRef, useState } from "react";
import Button from "./ui/Button";
import PhotoUploadDialog from "./PhotoUploadDialog";
import { useCart } from "../hooks/useCart";
import { getPersonalPhoto } from "../utils/personalPhotos";
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
  // Opt-in to the shared Button component. Call sites that pass a variant get
  // design-system sizing (needed wherever this sits beside another Button and
  // the two must match height); the rest keep the legacy class-based button.
  variant = null,
  size = "md",
  quantity = null,
}) {
  const { addToCart, cartItemIds } = useCart();
  const [isLocked, setIsLocked] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState("");
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
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

  const addNow = async () => {
    setIsLocked(true);
    setError("");

    try {
      // Awaited: the authenticated path is a server round-trip, and an
      // unawaited rejection used to be swallowed while the button still
      // claimed "Added".
      await addToCart(product, quantity ?? getMinimumOrderQty(product));
      setIsAdded(true);
      feedbackTimerRef.current = window.setTimeout(() => setIsAdded(false), 1600);
    } catch {
      setError("Couldn't add. Try again.");
    } finally {
      lockTimerRef.current = window.setTimeout(() => setIsLocked(false), 700);
    }
  };

  const handleClick = async () => {
    if (isLocked || isOutOfStock) {
      return;
    }

    // A personalised product needs the customer's photo first: ask for it,
    // then add once it's uploaded.
    if (product.photoUpload && !getPersonalPhoto(product.id)) {
      setIsPhotoDialogOpen(true);
      return;
    }

    await addNow();
  };

  const photoDialog = product.photoUpload ? (
    <PhotoUploadDialog
      open={isPhotoDialogOpen}
      onClose={() => setIsPhotoDialogOpen(false)}
      product={product}
      confirmLabel="Use this photo & add to cart"
      onUploaded={() => {
        setIsPhotoDialogOpen(false);
        addNow();
      }}
    />
  ) : null;

  if (variant) {
    return (
      <>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          onClick={handleClick}
          disabled={isLocked || isOutOfStock}
          aria-label={isOutOfStock ? undefined : `Add ${product.name} to cart`}
        >
          {isOutOfStock ? "Out of stock" : error || (isAdded ? addedLabel : idleLabel)}
        </Button>
        {photoDialog}
      </>
    );
  }

  if (isOutOfStock) {
    return (
      <button type="button" className={className} disabled aria-disabled="true">
        Out of stock
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${className} ${isInCart ? "in-cart-button" : ""} ${isAdded ? "added-button" : ""}`.trim()}
        onClick={handleClick}
        disabled={isLocked}
      >
        {error || (isAdded ? addedLabel : idleLabel)}
      </button>
      {photoDialog}
    </>
  );
}

export default AddToCartButton;
