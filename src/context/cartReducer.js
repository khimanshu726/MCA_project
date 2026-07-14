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

const addItem = (state, product, quantity = 1) => {
  const existingItem = state.find((item) => item.id === product.id);
  if (!existingItem) {
    return [...state, normalizeCartItem(product, quantity)];
  }
  return state.map((item) =>
    item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
  );
};

const setQuantity = (state, id, quantity) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  return state.map((item) => (item.id === id ? { ...item, quantity: safeQuantity } : item));
};

export function cartReducer(state, action) {
  switch (action.type) {
    case "ADD_ITEM":
      return addItem(state, action.payload.product, action.payload.quantity);
    case "REMOVE_ITEM":
      return state.filter((item) => item.id !== action.payload.id);
    case "SET_QUANTITY":
      return setQuantity(state, action.payload.id, action.payload.quantity);
    case "CLEAR_CART":
      return [];
    default:
      return state;
  }
}
