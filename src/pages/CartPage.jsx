import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CartItemCard from "../components/cart/CartItemCard";
import CartSkeleton from "../components/cart/CartSkeleton";
import EmptyCartState from "../components/cart/EmptyCartState";
import FrequentlyBoughtTogether from "../components/cart/FrequentlyBoughtTogether";
import OrderSummaryCard from "../components/cart/OrderSummaryCard";
import RecentlyViewed from "../components/cart/RecentlyViewed";
import SelectAllBar from "../components/cart/SelectAllBar";
import YouMayAlsoLike from "../components/cart/YouMayAlsoLike";
import Dialog from "../components/ui/Dialog";
import Toast from "../components/ui/Toast";
import Button from "../components/ui/Button";
import { useCart } from "../hooks/useCart";
import { useToast } from "../hooks/useToast";

function CartPage() {
  const navigate = useNavigate();
  const {
    items,
    cartItems,
    pricing,
    couponError,
    isLoading,
    isApplyingCoupon,
    pendingQuantityProductId,
    isAuthenticated,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleSaveForLater,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { toast, pushToast, dismiss } = useToast();

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => items.some((item) => item.productId === id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    if (couponError) {
      pushToast({ type: "error", message: couponError });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponError]);

  const activeItems = useMemo(() => items.filter((item) => !item.savedForLater), [items]);
  const savedItems = useMemo(() => items.filter((item) => item.savedForLater), [items]);
  const selectableItems = useMemo(() => activeItems.filter((item) => !item.isOutOfStock), [activeItems]);
  const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selectedIds.has(item.productId));

  // Checkout only ever includes purchasable items — active, in-stock, not
  // saved for later. Selection drives bulk delete, not partial checkout.
  const purchasableCartItems = useMemo(
    () =>
      cartItems.filter((item) =>
        activeItems.some((entry) => entry.productId === item.id && !entry.isOutOfStock && !entry.isMissing),
      ),
    [cartItems, activeItems],
  );

  const toggleSelect = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableItems.map((item) => item.productId)));
  };

  const handleRemove = async (productId) => {
    const removedItem = items.find((entry) => entry.productId === productId);
    await removeFromCart(productId);

    if (removedItem && !removedItem.isMissing) {
      pushToast({
        type: "info",
        message: `${removedItem.product.name} removed from cart.`,
        action: {
          label: "Undo",
          onClick: () => addToCart(removedItem.product, removedItem.quantity),
        },
      });
    }
  };

  const handleBulkRemove = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => removeFromCart(id)));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    pushToast({ type: "success", message: `${ids.length} item${ids.length === 1 ? "" : "s"} removed.` });
  };

  return (
    <main className="page-stack">
      <Toast toast={toast} onDismiss={dismiss} />

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Cart</p>
          <h2>Review your items before checkout.</h2>
          <p className="section-copy">
            Adjust quantities, save items for later, and apply a coupon before continuing to delivery and payment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <CartSkeleton />
            ) : items.length === 0 ? (
              <EmptyCartState />
            ) : (
              <>
                <SelectAllBar
                  allSelected={allSelected}
                  someSelected={selectedIds.size > 0}
                  onToggleAll={toggleSelectAll}
                  selectedCount={selectedIds.size}
                  totalCount={selectableItems.length}
                  onBulkRemove={() => setBulkDeleteOpen(true)}
                />

                {activeItems.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    selected={selectedIds.has(item.productId)}
                    onToggleSelect={toggleSelect}
                    onQuantityChange={updateQuantity}
                    onRemove={handleRemove}
                    onToggleSaveForLater={toggleSaveForLater}
                    isAuthenticated={isAuthenticated}
                    isQuantityPending={pendingQuantityProductId === item.productId}
                  />
                ))}

                {savedItems.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="mb-3 font-display text-lg text-ink-900">Saved for later ({savedItems.length})</h3>
                    <div className="flex flex-col gap-4">
                      {savedItems.map((item) => (
                        <CartItemCard
                          key={item.productId}
                          item={item}
                          selected={false}
                          onToggleSelect={() => undefined}
                          onQuantityChange={updateQuantity}
                          onRemove={handleRemove}
                          onToggleSaveForLater={toggleSaveForLater}
                          isAuthenticated={isAuthenticated}
                          isQuantityPending={pendingQuantityProductId === item.productId}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <FrequentlyBoughtTogether
              seedProductId={activeItems[0]?.productId}
              excludeIds={items.map((item) => item.productId)}
            />
            <YouMayAlsoLike items={activeItems} excludeIds={items.map((item) => item.productId)} />
            <RecentlyViewed excludeIds={items.map((item) => item.productId)} />
          </div>

          <aside className="flex flex-col gap-4">
            <OrderSummaryCard
              pricing={pricing}
              itemCount={purchasableCartItems.length}
              onCheckout={() => navigate("/checkout/address")}
              canCheckout={purchasableCartItems.length > 0}
              checkoutDisabledReason={
                purchasableCartItems.length === 0 ? "Add at least one available product to continue." : ""
              }
              isPlacingOrder={false}
              isAuthenticated={isAuthenticated}
              isApplyingCoupon={isApplyingCoupon}
              onApplyCoupon={applyCoupon}
              onRemoveCoupon={removeCoupon}
              ctaLabel="Proceed to checkout"
            />
          </aside>
        </div>
      </section>

      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title="Remove selected items?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkRemove}>
              Remove {selectedIds.size} item{selectedIds.size === 1 ? "" : "s"}
            </Button>
          </>
        }
      >
        This will remove {selectedIds.size} selected item{selectedIds.size === 1 ? "" : "s"} from your cart. You can
        undo individual removals from the toast that appears after.
      </Dialog>
    </main>
  );
}

export default CartPage;
