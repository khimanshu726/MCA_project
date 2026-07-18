import { useEffect, useRef } from "react";
import { useUserAuth } from "../context/UserAuthContext";
import { useCart as useGuestCart } from "../context/CartContext";
import { useServerCart } from "./useServerCart";
import { loadCartItems } from "../utils/cartStorage";

// Watches the guest -> authenticated transition and folds any local guest
// cart into the server cart exactly once per login. Uses a ref (not just
// the current isAuthenticated value) so repeated token refreshes from
// onIdTokenChanged don't trigger repeated merges.
//
// Gated on `token`, not just `isAuthenticated`, because the two do not arrive
// together. UserAuthContext sets authUser (which flips isAuthenticated true)
// synchronously, then awaits a profile round-trip before setToken. Firing on
// isAuthenticated alone raced that gap: the merge went out with an empty token,
// the server answered 401, the catch below silently reset, and — because token
// wasn't a dependency — it never retried. The guest cart was lost on every
// login. Waiting for the token, and depending on it, closes that window.
export function useCartMerge() {
  const { isAuthenticated, token } = useUserAuth();
  const server = useServerCart();
  const guest = useGuestCart();
  const wasReadyRef = useRef(isAuthenticated && Boolean(token));
  const hasMergedRef = useRef(false);

  useEffect(() => {
    // "Ready" means we can actually make an authenticated request, i.e. both
    // the session and the token that authorizes it are present.
    const isReady = isAuthenticated && Boolean(token);
    const wasReady = wasReadyRef.current;
    wasReadyRef.current = isReady;

    if (!isAuthenticated) {
      hasMergedRef.current = false;
      return;
    }

    if (!isReady || wasReady || hasMergedRef.current) {
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
  }, [isAuthenticated, token]);
}
