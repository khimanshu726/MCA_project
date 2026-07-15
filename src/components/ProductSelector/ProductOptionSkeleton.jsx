import Skeleton from "../ui/Skeleton";

function ProductOptionSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5" aria-hidden="true">
      <Skeleton className="h-11 w-11 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-3.5 w-12 shrink-0" />
    </div>
  );
}

export default ProductOptionSkeleton;
