import { request } from "../lib/api";

/**
 * Uploads the customer's photo for a personalised product. Guests can upload
 * (checkout allows guests); a signed-in customer's token links the photo to
 * their account. Returns { photo: { id, url, name } }.
 */
export const uploadCustomerPhoto = ({ productId, file, token }) => {
  const formData = new FormData();
  formData.append("productId", productId);
  formData.append("photo", file);
  // Phone photos on a slow connection can take a while; the default 12s
  // request timeout would cut them off.
  return request("/customer-photos", { method: "POST", body: formData, token: token || undefined, timeoutMs: 90000 });
};
