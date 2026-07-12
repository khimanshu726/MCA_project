import { useCallback, useRef, useState } from "react";

const TOAST_DEFAULT_DURATION_MS = 3200;

/**
 * Minimal toast controller. Returns the current toast object and a push
 * function that auto-dismisses.
 */
export function useToast(duration = TOAST_DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const pushToast = useCallback(
    (nextToast) => {
      setToast(nextToast);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, duration);
    },
    [duration],
  );

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  return { toast, pushToast, dismiss };
}
