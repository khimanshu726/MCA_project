import { useEffect, useRef } from "react";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart as useGuestCart } from "../context/CartContext";
import { useServerCart } from "./useServerCart";
import { loadCartItems } from "../utils/cartStorage";

// Watches the guest -> authenticated transition and folds any local guest
// cart into the server cart exactly once per login. Uses a ref (not just
// the current isAuthenticated value) so repeated token refreshes from
// onIdTokenChanged don't trigger repeated merges.
export function useCartMerge() {
  const { isAuthenticated } = useUserAuth();
  const server = useServerCart();
  const guest = useGuestCart();
  const wasAuthenticatedRef = useRef(isAuthenticated);
  const hasMergedRef = useRef(false);

  useEffect(() => {
    const wasAuthenticated = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;

    if (!isAuthenticated) {
      hasMergedRef.current = false;
      return;
    }

    if (wasAuthenticated || hasMergedRef.current) {
      return;
    }

    hasMergedRef.current = true;
    const localItems = loadCartItems();

    if (localItems.length === 0) {
      return;
    }

    server
      .merge(localItems.map((item) => ({ productId: item.id, quantity: item.quantity })))
      .then(() => {
        // Resets both the in-memory reducer and its persisted storage in one
        // write, so the guest bucket is empty and ready for the next guest.
        guest.clearCart();
      })
      .catch(() => {
        hasMergedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
