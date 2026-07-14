import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    // Snapshot of the price at the moment the item was added/last synced,
    // kept only to detect price drift — never used as the authoritative price.
    priceAtAdd: { type: Number, required: true, min: 0 },
    savedForLater: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const Cart = mongoose.model("Cart", cartSchema);
