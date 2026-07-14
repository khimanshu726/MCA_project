import { useCallback, useState } from "react";
import { loadRecentlyViewedIds, recordRecentlyViewed } from "../utils/recentlyViewedStorage";

export function useRecentlyViewed() {
  const [ids, setIds] = useState(loadRecentlyViewedIds);

  const recordView = useCallback((productId) => {
    recordRecentlyViewed(productId);
    setIds(loadRecentlyViewedIds());
  }, []);

  return { ids, recordView };
}
