import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import { cartReducer } from "./cartReducer";
import { loadCartItems, persistCartItems } from "../utils/cartStorage";

const CartContext = createContext(null);

function CartProvider({ children }) {
  const [cartItems, dispatch] = useReducer(cartReducer, [], loadCartItems);

  useEffect(() => {
    persistCartItems(cartItems);
  }, [cartItems]);

  const addToCart = useCallback((product, quantity = 1) => {
    dispatch({ type: "ADD_ITEM", payload: { product, quantity } });
  }, []);

  const removeFromCart = useCallback((id) => {
    dispatch({ type: "REMOVE_ITEM", payload: { id } });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    dispatch({ type: "SET_QUANTITY", payload: { id, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  );

  const actions = useMemo(
    () => ({ addToCart, removeFromCart, updateQuantity, clearCart }),
    [addToCart, clearCart, removeFromCart, updateQuantity],
  );

  const value = useMemo(
    () => ({ cartItems, cartCount, ...actions }),
    [actions, cartCount, cartItems],
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
