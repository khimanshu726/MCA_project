import { Wishlist } from "../models/Wishlist.js";

export const getOrCreateWishlist = async (customerId) => {
  let wishlist = await Wishlist.findOne({ customerId });

  if (!wishlist) {
    wishlist = await Wishlist.create({ customerId, items: [] });
  }

  return wishlist;
};

export const addItem = async (customerId, productId) => {
  const wishlist = await getOrCreateWishlist(customerId);
  const alreadyExists = wishlist.items.some((item) => item.productId === productId);

  if (!alreadyExists) {
    wishlist.items.push({ productId });
    await wishlist.save();
  }

  return wishlist;
};

export const removeItem = async (customerId, productId) => {
  const wishlist = await getOrCreateWishlist(customerId);
  wishlist.items = wishlist.items.filter((item) => item.productId !== productId);
  await wishlist.save();
  return wishlist;
};

export const clearWishlist = async (customerId) => {
  const wishlist = await getOrCreateWishlist(customerId);
  wishlist.items = [];
  await wishlist.save();
  return wishlist;
};
