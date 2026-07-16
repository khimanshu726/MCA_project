import mongoose from "mongoose";

// A saved customization: the full editor state (layers, transforms, options)
// plus a rendered preview. State is stored as-is so the studio can reopen a
// design exactly where the customer left it; nothing is flattened until the
// print file is generated at add-to-cart time.
const designSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    productId: { type: String, required: true },
    productName: { type: String, default: "" },
    templateId: { type: String, default: "" },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Editor state JSON (sides -> layers/background, product options,
    // schema version). Size is capped in the controller, not here.
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    // Small JPEG/PNG data URL (or uploaded URL) used for design cards.
    previewImage: { type: String, default: "" },
  },
  { timestamps: true },
);

designSchema.index({ customerId: 1, updatedAt: -1 });

export const Design = mongoose.model("Design", designSchema);
