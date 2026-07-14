import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, default: "", trim: true },
    landmark: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    district: { type: String, default: "", trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true },
    addressType: { type: String, enum: ["home", "office", "other"], default: "home" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Address = mongoose.model("Address", addressSchema);
