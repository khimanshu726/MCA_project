import { Design } from "../models/Design.js";

// Hard ceiling per customer so a single account can't grow the collection
// without bound; the studio surfaces this as "delete an old design first".
export const MAX_DESIGNS_PER_CUSTOMER = 50;

const summaryProjection = "_id name productId productName templateId previewImage createdAt updatedAt";

export const listDesigns = (customerId) =>
  Design.find({ customerId }).select(summaryProjection).sort({ updatedAt: -1 }).lean();

export const countDesigns = (customerId) => Design.countDocuments({ customerId });

export const getDesign = (customerId, designId) => Design.findOne({ _id: designId, customerId });

export const createDesign = (customerId, fields) => Design.create({ customerId, ...fields });

export const updateDesign = async (customerId, designId, fields) => {
  const design = await Design.findOne({ _id: designId, customerId });
  if (!design) {
    return null;
  }

  const allowed = ["name", "state", "previewImage", "productId", "productName", "templateId"];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      design[key] = fields[key];
    }
  }

  await design.save();
  return design;
};

export const duplicateDesign = async (customerId, designId) => {
  const source = await Design.findOne({ _id: designId, customerId }).lean();
  if (!source) {
    return null;
  }

  const copyName = `${source.name} (copy)`.slice(0, 120);

  return Design.create({
    customerId,
    productId: source.productId,
    productName: source.productName,
    templateId: source.templateId,
    name: copyName,
    state: source.state,
    previewImage: source.previewImage,
  });
};

export const deleteDesign = (customerId, designId) =>
  Design.findOneAndDelete({ _id: designId, customerId });
