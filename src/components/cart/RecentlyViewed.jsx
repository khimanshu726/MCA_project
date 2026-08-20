import ProductRail from "./ProductRail";
import { useProducts } from "../../hooks/useProducts";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";

function RecentlyViewed({ excludeIds = [] }) {
  const { ids } = useRecentlyViewed();
  const visibleIds = ids.filter((id) => !excludeIds.includes(id));
  const { data } = useProducts({ ids: visibleIds });
  const items = data?.items ?? [];

  return <ProductRail title="Recently viewed" products={items} />;
}

export default RecentlyViewed;
