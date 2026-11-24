import mongoose from "mongoose";

/**
 * A photo a customer uploaded for a personalised product (e.g. "Personalized
 * Wall Art with your own photo"). Stored before the order exists: the customer
 * uploads it from the product card or page, then the order line refers to it
 * by id and the server copies the URL onto the line. `orderId` is set once an
 * order uses it, so ordered photos can be told apart from abandoned ones.
 */
const customerPhotoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    productId: { type: String, required: true, index: true },
    // Empty for guests, who may check out without an account.
    customerId: { type: String, default: "" },
    url: { type: String, required: true },
    // Cloudinary public id, or the file name on local disk in development.
    storageId: { type: String, default: "" },
    originalName: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    orderId: { type: String, default: "", index: true },
  },
  { timestamps: true },
);

export const CustomerPhoto = mongoose.models.CustomerPhoto || mongoose.model("CustomerPhoto", customerPhotoSchema);
