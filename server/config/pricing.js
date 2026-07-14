import "dotenv/config";

export const pricingConfig = {
  platformFee: Number(process.env.PLATFORM_FEE || 15),
  taxRate: Number(process.env.TAX_RATE || 0.05),
  shippingFee: Number(process.env.SHIPPING_FEE || 120),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD || 1000),
};
