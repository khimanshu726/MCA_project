import mongoose from "mongoose";

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    orderId: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerId: { type: String },
    phone: { type: String, required: true },
    email: { type: String },
    address: {
      street: { type: String, required: true },
      landmark: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    productName: { type: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    couponDiscount: { type: Number, default: 0 },
    customizationDetails: { type: String },
    uploadedFileURL: { type: String },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: "Pending" },
    orderStatus: { type: String, default: "New" },
    notificationStatus: { type: String, default: "Unread" },
    archived: { type: Boolean, default: false },
    lineItems: { type: Array, default: [] },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    // Shipment. `trackingId` alone was never enough to be useful: a bare
    // consignment number can't become a link without knowing whose number it
    // is, so it sat on the order page as text nobody could act on. `courier`
    // is one of src/utils/couriers.js, which owns the tracking URLs.
    trackingId: { type: String, default: "" },
    courier: { type: String, default: "" },
    // Set by a human when they hand the parcel over, not derived. Nothing here
    // talks to a carrier, so any computed date would be a guess presented as a
    // promise.
    expectedDeliveryDate: { type: Date, default: null },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
