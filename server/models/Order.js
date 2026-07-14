import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
