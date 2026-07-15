import { Coupon } from "../models/Coupon.js";

const exampleCoupons = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    minOrderValue: 500,
    maxDiscount: 200,
    isActive: true,
  },
  {
    code: "FLAT50",
    type: "flat",
    value: 50,
    minOrderValue: 300,
    isActive: true,
  },
  {
    code: "FREESHIP",
    type: "free_shipping",
    value: 0,
    minOrderValue: 200,
    isActive: true,
  },
];

// Auto-seed on server startup only when the collection is empty, so a real
// deployment's admin-created coupons are never overwritten — same pattern
// as ensureProductsSeeded.
export const ensureCouponsSeeded = async () => {
  const existingCount = await Coupon.countDocuments();

  if (existingCount > 0) {
    return { seeded: false };
  }

  await Coupon.insertMany(exampleCoupons);
  return { seeded: true, count: exampleCoupons.length };
};
