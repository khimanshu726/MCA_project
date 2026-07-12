import { useEffect, useState, useCallback } from "react";

/**
 * OTP resend countdown timer hook.
 * Encapsulates the interval logic and provides a start() function.
 */
export function useOtpTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [seconds]);

  const start = useCallback((nextSeconds) => {
    setSeconds(Math.max(0, Number(nextSeconds) || 0));
  }, []);

  const reset = useCallback(() => setSeconds(0), []);

  return { seconds, start, reset };
}
