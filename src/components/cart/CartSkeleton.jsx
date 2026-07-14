import Skeleton from "../ui/Skeleton";

function CartItemSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
      <Skeleton className="h-24 w-24 shrink-0 sm:h-28 sm:w-28" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

function CartSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <CartItemSkeleton key={index} />
      ))}
    </div>
  );
}

export { CartItemSkeleton };
export default CartSkeleton;
