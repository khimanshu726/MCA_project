/**
 * Pure cart reducer. Kept as its own module so it can be unit-tested without
 * pulling in React or storage side-effects.
 */

const normalizeCartItem = (product, quantity = 1) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  category: product.category,
  description: product.description,
  images: product.images,
  quantity: Math.max(1, quantity),
});

const addItem = (state, product) => {
  const existingItem = state.find((item) => item.id === product.id);
  if (!existingItem) {
    return [...state, normalizeCartItem(product)];
  }
  return state.map((item) =>
    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
  );
};

const incrementItem = (state, id) =>
  state.map((item) =>
    item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
  );

const decrementItem = (state, id) =>
  state.flatMap((item) => {
    if (item.id !== id) return [item];
    if (item.quantity <= 1) return [];
    return [{ ...item, quantity: item.quantity - 1 }];
  });

const updateQuantity = (state, id, mode) => {
  if (mode === "increment") return incrementItem(state, id);
  if (mode === "decrement") return decrementItem(state, id);
  return state;
};

export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM":
      return addItem(state, action.payload.product);
    case "REMOVE_ITEM":
      return state.filter((item) => item.id !== action.payload.id);
    case "UPDATE_QUANTITY":
      return updateQuantity(state, action.payload.id, action.payload.mode);
    case "CLEAR_CART":
      return [];
    default:
      return state;
  }
}
