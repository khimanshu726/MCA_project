import { useEffect, useRef, useState } from "react";
import { PINCODE_STATUS, lookupPincode } from "../utils/pincodeApi";

const LOOKUP_DELAY_MS = 400;

const IDLE = { isLoading: false, result: null, notFound: false, unavailable: false };

/**
 * Debounced pincode -> {city, state} lookup.
 *
 * Fires only once the value is a complete 6-digit pincode, and a stale
 * in-flight request is discarded if the pincode changes again before it
 * resolves — otherwise a slow response for "8543" could land after the one
 * for "854301" and overwrite the right answer with the wrong one.
 *
 * Repeats of the same pincode are answered from the cache in pincodeApi, so
 * re-entering a value the customer already typed costs no request and shows
 * no loading state.
 *
 * The two failure modes are reported separately because they are not the same
 * thing: `notFound` means the customer mistyped and should be told so;
 * `unavailable` means we couldn't reach the service, which is our problem and
 * must never be phrased as though their pincode were wrong.
 */
export function usePincodeLookup(pincode) {
  const [state, setState] = useState(IDLE);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!/^\d{6}$/.test(pincode || "")) {
      requestIdRef.current += 1;
      setState(IDLE);
      return undefined;
    }

    const requestId = ++requestIdRef.current;
    setState({ ...IDLE, isLoading: true });

    const timer = setTimeout(async () => {
      const outcome = await lookupPincode(pincode);
      if (requestIdRef.current !== requestId) return;

      setState({
        isLoading: false,
        result: outcome.status === PINCODE_STATUS.FOUND ? outcome : null,
        notFound: outcome.status === PINCODE_STATUS.NOT_FOUND,
        unavailable: outcome.status === PINCODE_STATUS.UNAVAILABLE,
      });
    }, LOOKUP_DELAY_MS);

    return () => clearTimeout(timer);
  }, [pincode]);

  return state;
}
