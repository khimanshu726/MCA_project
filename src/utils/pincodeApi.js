/**
 * India Post's public pincode lookup (no key required). Used to auto-fill
 * city/state from a 6-digit pincode instead of asking the customer to type
 * them.
 */

/** Outcomes are distinguished because they mean different things to the user. */
export const PINCODE_STATUS = {
  /** The pincode exists and we know where it is. */
  FOUND: "found",
  /** The service answered, and says no such pincode. The customer mistyped. */
  NOT_FOUND: "not_found",
  /** We couldn't reach the service. Our problem, not theirs. */
  UNAVAILABLE: "unavailable",
};

/**
 * Results are cached for the lifetime of the page.
 *
 * Pincode -> location is effectively immutable, and without this, blurring and
 * refocusing the field, or correcting a later field and coming back, refetches
 * the same answer. The cache also means retyping the same pincode resolves
 * instantly rather than flashing a loading state at a value we already know.
 */
const cache = new Map();

export async function lookupPincode(pincode) {
  if (cache.has(pincode)) {
    return cache.get(pincode);
  }

  let outcome;

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);

    if (!response.ok) {
      // A transport-level failure tells us nothing about the pincode itself,
      // so it must not be reported to the customer as a bad pincode.
      return { status: PINCODE_STATUS.UNAVAILABLE };
    }

    const data = await response.json();
    const result = data?.[0];
    const postOffice = result?.PostOffice?.[0];

    if (result?.Status !== "Success" || !postOffice) {
      outcome = { status: PINCODE_STATUS.NOT_FOUND };
    } else {
      outcome = {
        status: PINCODE_STATUS.FOUND,
        area: postOffice.Name,
        // India Post's District is the closest thing it has to a city, and is
        // what a delivery address wants.
        city: postOffice.District,
        district: postOffice.District,
        state: postOffice.State,
      };
    }
  } catch {
    return { status: PINCODE_STATUS.UNAVAILABLE };
  }

  // Only definitive answers are cached. An unreachable service is a temporary
  // condition, and caching it would keep the customer on manual entry for the
  // rest of the session even after the network recovers.
  cache.set(pincode, outcome);
  return outcome;
}
