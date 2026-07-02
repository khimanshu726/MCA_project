import { normalizeMobileInput } from "../utils/authDetection";

/**
 * Convert a 10-digit Indian mobile number to E.164 format (+91xxxxxxxxxx).
 * Returns empty string if invalid.
 */
export function toE164IndianNumber(value) {
  const digits = normalizeMobileInput(value);
  if (digits.length !== 10) {
    return "";
  }
  return `+91${digits}`;
}

/**
 * Serialize a Firebase error for logging without leaking objects.
 */
export function serializeFirebaseError(error) {
  return {
    name: error?.name || "",
    code: error?.code || "",
    message: error?.message || "",
    customData: error?.customData || null,
    stack: error?.stack || "",
  };
}
