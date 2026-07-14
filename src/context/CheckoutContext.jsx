import { createContext, useContext, useMemo, useState } from "react";

const CheckoutContext = createContext(null);

const emptyAddressState = {
  selectedAddress: null,
  effectiveAddress: null,
  hasErrors: false,
  openForm: () => undefined,
};

// Small piece of shared state across the /checkout/* route subtree —
// replaces the local useStates that used to live in CartPage directly.
// The cart items/pricing themselves stay owned by useCart (server state);
// this only tracks the checkout-flow-specific fields.
export function CheckoutProvider({ children }) {
  const [addressState, setAddressState] = useState(emptyAddressState);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [customInstructions, setCustomInstructions] = useState("");
  const [designFile, setDesignFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const value = useMemo(
    () => ({
      addressState,
      setAddressState,
      paymentMethod,
      setPaymentMethod,
      customInstructions,
      setCustomInstructions,
      designFile,
      setDesignFile,
      fileError,
      setFileError,
    }),
    [addressState, paymentMethod, customInstructions, designFile, fileError],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
