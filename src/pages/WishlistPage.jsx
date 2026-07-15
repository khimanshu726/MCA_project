import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import PriceDisplay from "../components/ui/PriceDisplay";
import ResponsiveImage from "../components/ResponsiveImage";
import { useWishlist } from "../hooks/useWishlist";
import { useCart } from "../hooks/useCart";
import { useToast } from "../hooks/useToast";
import Toast from "../components/ui/Toast";

function WishlistItemCard({ item, onMoveToCart, onRemove }) {
  const { product, isMissing, isOutOfStock } = item;

  if (isMissing) {
    return (
      <Card className="flex items-center gap-3 border-dashed text-sm text-ink-500">
        <span className="flex-1">This product is no longer available.</span>
        <button type="button" className="font-semibold text-danger-600 hover:underline" onClick={() => onRemove(item.productId)}>
          Remove
        </button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Link to={`/products/${product.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-50">
        <ResponsiveImage src={product.images?.[0]} alt={product.name} aspectClassName="ratio-square" width={96} />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{product.category}</p>
            <Link to={`/products/${product.id}`} className="font-display text-lg text-ink-900 hover:text-brand-600">
              {product.name}
            </Link>
          </div>
          <PriceDisplay price={product.price} mrp={product.mrp} discountPercent={product.discountPercent} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOutOfStock ? <Badge tone="danger">Out of stock</Badge> : <Badge tone="success">In stock</Badge>}
        </div>

        <div className="mt-1 flex items-center gap-4">
          <Button size="sm" variant="secondary" disabled={isOutOfStock} onClick={() => onMoveToCart(item)}>
            Move to cart
          </Button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-danger-600 hover:text-danger-700"
            onClick={() => onRemove(item.productId)}
          >
            <Trash2 size={15} />
            Remove
          </button>
        </div>
      </div>
    </Card>
  );
}

function WishlistPage() {
  const { items, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast, pushToast, dismiss } = useToast();

  const handleMoveToCart = async (item) => {
    await addToCart(item.product, item.product.minimumOrderQty || 1);
    await removeFromWishlist(item.productId);
    pushToast({ type: "success", message: `${item.product.name} moved to cart.` });
  };

  const handleRemove = async (productId) => {
    await removeFromWishlist(productId);
  };

  return (
    <main className="page-stack">
      <Toast toast={toast} onDismiss={dismiss} />

      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Wishlist</p>
          <h2>Products you&rsquo;re saving for later.</h2>
          <p className="section-copy">Keep track of items you like and move them to your cart whenever you&rsquo;re ready.</p>
        </div>

        {isLoading ? (
          <p className="section-copy">Loading your wishlist&hellip;</p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart icon on any product to save it here."
            action={
              <Button as={Link} to="/products">
                Browse products
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <WishlistItemCard key={item.productId} item={item} onMoveToCart={handleMoveToCart} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default WishlistPage;
