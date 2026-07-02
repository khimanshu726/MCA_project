import { useCallback, useEffect, useState } from "react";
import { fetchCustomerOrders } from "../lib/api";
import { devError } from "../utils/logger";

/**
 * Loads and manages customer orders for a given auth token.
 * Provides { orders, isLoading, error, refresh }.
 */
export function useCustomerOrders(token) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (activeToken) => {
    if (!activeToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetchCustomerOrders(activeToken);
      setOrders(response.orders || []);
    } catch (fetchError) {
      devError("[useCustomerOrders] failed to load orders", fetchError);
      setError("Failed to load your order history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    load(token);
  }, [token, load]);

  const refresh = useCallback(() => load(token), [load, token]);

  return { orders, isLoading, error, refresh };
}
