/**
 * India Post's public pincode lookup (no key required). Used to auto-fill
 * city/district/state from a 6-digit pincode instead of asking the customer
 * to type them.
 */
export async function lookupPincode(pincode) {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!response.ok) return { success: false };

    const data = await response.json();
    const result = data?.[0];
    const postOffice = result?.PostOffice?.[0];

    if (result?.Status !== "Success" || !postOffice) {
      return { success: false };
    }

    return {
      success: true,
      area: postOffice.Name,
      district: postOffice.District,
      state: postOffice.State,
    };
  } catch {
    return { success: false };
  }
}
