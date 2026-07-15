import { Cart } from "../models/Cart.js";

export const getOrCreateCart = async (customerId) => {
  let cart = await Cart.findOne({ customerId });

  if (!cart) {
    cart = await Cart.create({ customerId, items: [] });
  }

  return cart;
};

export const addItem = async (customerId, { productId, quantity, priceAtAdd }) => {
  const cart = await getOrCreateCart(customerId);
  const existing = cart.items.find((item) => item.productId === productId);

  if (existing) {
    existing.quantity += quantity;
    existing.priceAtAdd = priceAtAdd;
  } else {
    cart.items.push({ productId, quantity, priceAtAdd, savedForLater: false });
  }

  await cart.save();
  return cart;
};

export const setItemQuantity = async (customerId, productId, quantity, priceAtAdd) => {
  const cart = await getOrCreateCart(customerId);
  const item = cart.items.find((entry) => entry.productId === productId);

  if (!item) {
    return null;
  }

  item.quantity = quantity;

  if (priceAtAdd !== undefined) {
    item.priceAtAdd = priceAtAdd;
  }

  await cart.save();
  return cart;
};

export const removeItem = async (customerId, productId) => {
  const cart = await getOrCreateCart(customerId);
  cart.items = cart.items.filter((item) => item.productId !== productId);
  await cart.save();
  return cart;
};

export const setSavedForLater = async (customerId, productId, savedForLater) => {
  const cart = await getOrCreateCart(customerId);
  const item = cart.items.find((entry) => entry.productId === productId);

  if (!item) {
    return null;
  }

  item.savedForLater = savedForLater;
  await cart.save();
  return cart;
};

export const clearCart = async (customerId) => {
  const cart = await getOrCreateCart(customerId);
  cart.items = [];
  await cart.save();
  return cart;
};

export const replaceItems = async (customerId, items) => {
  const cart = await getOrCreateCart(customerId);
  cart.items = items;
  await cart.save();
  return cart;
};

export const setAppliedCoupon = async (customerId, code) => {
  const cart = await getOrCreateCart(customerId);
  cart.appliedCouponCode = code;
  await cart.save();
  return cart;
};
