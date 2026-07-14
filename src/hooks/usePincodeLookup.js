import { useEffect, useRef, useState } from "react";
import { lookupPincode } from "../utils/pincodeApi";

const LOOKUP_DELAY_MS = 400;

/**
 * Debounced pincode -> {area, district, state} lookup. Only fires once the
 * value is a complete 6-digit pincode; a stale in-flight request is ignored
 * if the pincode changes again before it resolves.
 */
export function usePincodeLookup(pincode) {
  const [state, setState] = useState({ isLoading: false, result: null, error: null });
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode || "")) {
      requestIdRef.current += 1;
      setState({ isLoading: false, result: null, error: null });
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setState({ isLoading: true, result: null, error: null });

    const timer = setTimeout(async () => {
      const result = await lookupPincode(pincode);
      if (requestIdRef.current !== requestId) return;

      if (result.success) {
        setState({ isLoading: false, result, error: null });
      } else {
        setState({
          isLoading: false,
          result: null,
          error: "Couldn't auto-detect this pincode. Enter the city and state manually.",
        });
      }
    }, LOOKUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [pincode]);

  return state;
}
