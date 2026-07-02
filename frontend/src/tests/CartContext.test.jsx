import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { CartProvider, useCart } from "../context/CartContext.jsx";

// Dummy component strictly to consume mapping hooks
const TestComponent = () => {
  const { cartItems, addToCart, clearCart, cartCount } = useCart();

  return (
    <div>
      <div data-testid="item-count">{cartItems.length}</div>
      <div data-testid="cart-count">{cartCount}</div>
      <button
        data-testid="add-button"
        onClick={() =>
          addToCart({ id: "p1", price: 100, name: "Test Product" })
        }
      >
        Add Item
      </button>
      <button data-testid="clear-button" onClick={clearCart}>
        Clear Cart
      </button>
    </div>
  );
};

describe("CartContext React DOM", () => {
  it("should initialize with an empty cart and compute totals accurately during user interactions", async () => {
    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>
    );

    // Assert initial state is strictly empty
    expect(screen.getByTestId("item-count").textContent).toBe("0");
    expect(screen.getByTestId("cart-count").textContent).toBe("0");

    // Add item interaction
    act(() => {
      screen.getByTestId("add-button").click();
    });

    // We added 1 item, cart length should be 1 unit type
    expect(screen.getByTestId("item-count").textContent).toBe("1");
    // total cart count should be 1
    expect(screen.getByTestId("cart-count").textContent).toBe("1");

    // Clear cart interaction
    act(() => {
      screen.getByTestId("clear-button").click();
    });

    // Check back to zero
    expect(screen.getByTestId("item-count").textContent).toBe("0");
    expect(screen.getByTestId("cart-count").textContent).toBe("0");
  });
});
