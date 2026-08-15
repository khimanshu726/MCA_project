import mongoose from "mongoose";

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
