import mongoose from "mongoose";

/**
 * Named, ever-increasing counters (e.g. "product" for product numbers
 * EI-0001, EI-0002…). `nextSequence` is a single atomic $inc, so two requests
 * at the same moment can never receive the same number, and a number is never
 * handed out twice, even after the thing that used it is deleted.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export const nextSequence = async (name) => {
  const row = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return row.seq;
};

/** Moves a counter forward to at least `value` (never backwards). */
export const raiseSequenceTo = async (name, value) => {
  await Counter.updateOne({ _id: name }, { $max: { seq: value } }, { upsert: true });
};
