import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

const CART_STORAGE_KEY = "inkwell-cart-items";

const CartContext = createContext(null);

const normalizeCartItem = (product, quantity = 1) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  category: product.category,
  description: product.description,
  images: product.images,
  quantity: Math.max(1, quantity),
});

const loadCartItems = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        ...item,
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));
  } catch {
    return [];
  }
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product } = action.payload;
      const existingItem = state.find((item) => item.id === product.id);

      if (existingItem) {
        return state.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [...state, normalizeCartItem(product)];
    }

    case "REMOVE_ITEM":
      return state.filter((item) => item.id !== action.payload.id);

    case "UPDATE_QUANTITY": {
      const { id, mode } = action.payload;

      if (mode === "increment") {
        return state.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      if (mode === "decrement") {
        return state.flatMap((item) => {
          if (item.id !== id) {
            return [item];
          }

          if (item.quantity <= 1) {
            return [];
          }

          return [{ ...item, quantity: item.quantity - 1 }];
        });
      }

      return state;
    }

    default:
      return state;
  }
};

function CartProvider({ children }) {
  const [cartItems, dispatch] = useReducer(cartReducer, [], loadCartItems);

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product) => {
    dispatch({
      type: "ADD_ITEM",
      payload: { product },
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    dispatch({
      type: "REMOVE_ITEM",
      payload: { id },
    });
  }, []);

  const updateQuantity = useCallback((id, mode) => {
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { id, mode },
    });
  }, []);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      addToCart,
      removeFromCart,
      updateQuantity,
    }),
    [addToCart, cartCount, cartItems, removeFromCart, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
};

export { CartProvider, useCart };
