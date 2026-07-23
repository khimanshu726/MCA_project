import { Heart } from "lucide-react";
import { useWishlist } from "../../hooks/useWishlist";
import { useAuthModal } from "../../context/AuthModalContext";

// Self-contained heart toggle (same self-containment pattern as
// AddToCartButton). The wishlist has no guest tier, so a signed-out click opens
// the auth modal in place rather than navigating away — and the moment the
// customer signs in, the item they clicked is saved. Nothing is lost to the
// detour, which is the whole point of the modal over a redirect.
function WishlistButton({ productId, className = "" }) {
  const { isAuthenticated, wishlistIds, addToWishlist, removeFromWishlist } = useWishlist();
  const { openAuth } = useAuthModal();
  const isSaved = wishlistIds.has(productId);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      const signedIn = await openAuth({ reason: "Sign in to save items to your wishlist" });
      if (!signedIn) {
        return;
      }
      // Freshly signed in: the item wasn't in this account's list (the click
      // is what expresses the intent), so add it outright.
      addToWishlist(productId);
      return;
    }

    if (isSaved) {
      removeFromWishlist(productId);
    } else {
      addToWishlist(productId);
    }
  };

  return (
    <button
      type="button"
      className={`wishlist-toggle ${isSaved ? "is-saved" : ""} ${className}`.trim()}
      onClick={handleClick}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
    >
      <Heart size={16} strokeWidth={1.8} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}

export default WishlistButton;
