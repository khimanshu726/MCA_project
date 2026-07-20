import { Order } from "../models/Order.js";
import { getProductById, getProductsByIds, listProducts } from "./productStore.js";

// Real order co-occurrence, ranked by how often each product was bought
// alongside the seed product. Falls back to same-category products when
// there isn't enough order history yet (expected in a low-volume dev DB) so
// the rail never looks sparse or empty.
export const getFrequentlyBoughtTogether = async (productId, limit = 4) => {
  const seedProduct = await getProductById(productId);

  if (!seedProduct) {
    return [];
  }

  const coOccurrences = await Order.aggregate([
    { $match: { "lineItems.productId": productId } },
    { $unwind: "$lineItems" },
    { $match: { "lineItems.productId": { $ne: productId } } },
    { $group: { _id: "$lineItems.productId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  const coOccurringIds = coOccurrences.map((entry) => entry._id);
  const coOccurringProducts = await getProductsByIds(coOccurringIds);
  const activeCoOccurring = coOccurringIds
    .map((id) => coOccurringProducts.find((product) => product.id === id))
    .filter((product) => product && product.status === "active");

  if (activeCoOccurring.length >= limit) {
    return activeCoOccurring.slice(0, limit);
  }

  const excludeIds = new Set([productId, ...activeCoOccurring.map((product) => product.id)]);
  const remaining = limit - activeCoOccurring.length;

  const { items: categoryFallback } = await listProducts({
    category: seedProduct.category,
    limit: remaining + excludeIds.size,
  });

  const paddedFallback = categoryFallback.filter((product) => !excludeIds.has(product.id)).slice(0, remaining);

  return [...activeCoOccurring, ...paddedFallback];
};
