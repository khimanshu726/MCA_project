import mongoose from "mongoose";

// A single configured line on a quote request — a product plus the spec options
// (Paper type, Size, …) the institution picked for it. Descriptive only: quotes
// carry no pricing, so nothing here is priced. `_id: false` keeps the shape flat.
const enquiryItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    productName: { type: String, required: true, trim: true },
    options: {
      type: [
        new mongoose.Schema(
          { label: { type: String, trim: true }, value: { type: String, trim: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
    quantity: { type: Number, min: 1, default: 1 },
  },
  { _id: false },
);

/**
 * A bulk/custom quote request from an institution (school, college, university).
 * Public lead capture — institutions that procure via quote/PO rather than
 * instant card checkout submit their requirements here and the shop follows up.
 */
const enquirySchema = new mongoose.Schema(
  {
    institutionName: { type: String, required: true, trim: true },
    institutionType: {
      type: String,
      enum: ["school", "college", "university", "other"],
      default: "other",
    },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: "" },
    // Free-text list of items + quantities the institution needs.
    requirements: { type: String, required: true, trim: true },
    // Optional structured line items (product + picked options + quantity), added
    // via the product-aware quote form. The free-text `requirements` stays the
    // catch-all, so these are purely additive.
    items: { type: [enquiryItemSchema], default: [] },
    // Optional customer sample attachment (PDF/PNG/JPG) — a durable upload URL.
    sampleUrl: { type: String, default: "" },
    sampleName: { type: String, default: "" },
    message: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["new", "contacted", "quoted", "closed"],
      default: "new",
    },
  },
  { timestamps: true },
);

enquirySchema.index({ status: 1, createdAt: -1 });

export const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);
