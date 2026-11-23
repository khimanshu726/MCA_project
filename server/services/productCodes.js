import { Product } from "../models/Product.js";
import { nextSequence, raiseSequenceTo } from "../models/Counter.js";

// Short, readable, permanent product numbers: EI-0001, EI-0002… (then
// EI-10000 and up). The uuid `id` stays the database key and the URL; this is
// the number people say on the phone, search for, and see on invoices.
export const PRODUCT_CODE_PREFIX = "EI-";
const COUNTER = "product";

export const formatProductCode = (seq) => `${PRODUCT_CODE_PREFIX}${String(seq).padStart(4, "0")}`;

const seqOf = (code) => {
  const match = typeof code === "string" ? code.match(/^EI-(\d+)$/) : null;
  return match ? Number(match[1]) : 0;
};

export const nextProductCode = async () => formatProductCode(await nextSequence(COUNTER));

/**
 * Numbers every product that doesn't have a code yet, oldest first, after any
 * numbers already given out. Safe to run on every start: products that have a
 * code are never renumbered, so a second run changes nothing.
 */
export const ensureProductCodes = async () => {
  try {
    const numbered = await Product.find({ code: { $nin: ["", null] } }, { code: 1 }).lean();
    const highest = numbered.reduce((max, row) => Math.max(max, seqOf(row.code)), 0);
    await raiseSequenceTo(COUNTER, highest);

    const missing = await Product.find({ $or: [{ code: { $exists: false } }, { code: "" }, { code: null }] })
      .sort({ createdAt: 1, _id: 1 })
      .select({ _id: 1 })
      .lean();
    for (const row of missing) {
      // updateOne with a guard, so a product numbered meanwhile is left alone.
      await Product.updateOne(
        { _id: row._id, $or: [{ code: { $exists: false } }, { code: "" }, { code: null }] },
        { $set: { code: await nextProductCode() } },
      );
    }
    return { numbered: missing.length };
  } catch (error) {
    // Never fatal: the shop works without numbers; they'll be added next start.
    console.error("[product-codes] numbering failed — continuing startup without it.", error);
    return { numbered: 0, failed: true };
  }
};
