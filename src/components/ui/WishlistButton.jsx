import { Heart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWishlist } from "../../hooks/useWishlist";

// Self-contained heart toggle (same self-containment pattern as
// AddToCartButton) — a signed-out click redirects to /login with a return
// path, mirroring ProtectedRoute's redirect behavior, since the wishlist
// has no guest tier.
function WishlistButton({ productId, className = "" }) {
  const { isAuthenticated, wishlistIds, addToWishlist, removeFromWishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const isSaved = wishlistIds.has(productId);

  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
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
