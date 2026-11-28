import mongoose from "mongoose";

/**
 * A photo a customer uploaded for a personalised product (e.g. "Personalized
 * Wall Art with your own photo"). Stored before the order exists: the customer
 * uploads it from the product card or page, then the order line names it by id.
 * `orderId` is set once an order uses it, so ordered photos can be told apart
 * from abandoned ones.
 *
 * Photos are private: the file sits in Cloudinary as a "private" asset (local
 * disk outside /uploads in development) and is only opened through a signed,
 * expiring link the admin asks for. Rows made before that change kept a public
 * `url`; new rows leave it empty.
 */
const customerPhotoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    productId: { type: String, required: true, index: true },
    // Empty for guests, who may check out without an account.
    customerId: { type: String, default: "" },
    // "cloudinary" or "disk" (local development).
    storage: { type: String, default: "" },
    // Cloudinary public id, or the file name on local disk.
    storageId: { type: String, default: "" },
    format: { type: String, default: "" },
    isPrivate: { type: Boolean, default: false },
    // Public URL of photos stored before they were made private.
    url: { type: String, default: "" },
    originalName: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    orderId: { type: String, default: "", index: true },
  },
  { timestamps: true },
);

export const CustomerPhoto = mongoose.models.CustomerPhoto || mongoose.model("CustomerPhoto", customerPhotoSchema);
