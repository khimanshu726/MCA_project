import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "../context/CartContext.jsx";
import { useCart } from "../hooks/useCart.js";
import { useCartMerge } from "../hooks/useCartMerge.js";
import * as cartApi from "../api/cartApi.js";
import * as productsApi from "../api/productsApi.js";

const mockUseUserAuth = vi.fn();

vi.mock("../context/UserAuthContext", () => ({
  useUserAuth: () => mockUseUserAuth(),
}));

vi.mock("../api/cartApi.js");
vi.mock("../api/productsApi.js");

const CART_STORAGE_KEY = "elite-empressions-cart-items-v2";

const renderWithProviders = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartProvider>{ui}</CartProvider>
    </QueryClientProvider>,
  );
};

const TestComponent = () => {
  const { cartItems, cartCount, addToCart, clearCart } = useCart();

  return (
    <div>
      <div data-testid="item-count">{cartItems.length}</div>
      <div data-testid="cart-count">{cartCount}</div>
      <button
        data-testid="add-button"
        onClick={() =>
          addToCart({
            id: "p1",
            price: 100,
            name: "Test Product",
            images: ["x.jpg"],
            category: "Cards",
            description: "d",
          })
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

describe("useCart (guest path)", () => {
  beforeEach(() => {
    mockUseUserAuth.mockReturnValue({ isAuthenticated: false, token: "" });
    productsApi.listProducts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24 });
    window.localStorage.clear();
  });

  it("initializes empty and tracks additions/clears through the guest reducer", async () => {
    renderWithProviders(<TestComponent />);

    expect(screen.getByTestId("item-count").textContent).toBe("0");
    expect(screen.getByTestId("cart-count").textContent).toBe("0");

    await act(async () => {
      screen.getByTestId("add-button").click();
    });

    await waitFor(() => expect(screen.getByTestId("item-count").textContent).toBe("1"));
    expect(screen.getByTestId("cart-count").textContent).toBe("1");

    await act(async () => {
      screen.getByTestId("clear-button").click();
    });

    await waitFor(() => expect(screen.getByTestId("item-count").textContent).toBe("0"));
  });
});

describe("useCartMerge", () => {
  beforeEach(() => {
    window.localStorage.clear();
    productsApi.listProducts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24 });
    cartApi.getCart.mockResolvedValue({ items: [], pricing: { subtotal: 0 } });
    cartApi.mergeCartRemote.mockResolvedValue({ items: [], pricing: { subtotal: 0 }, clamped: [] });
  });

  it("merges the guest cart into the server cart exactly once on login", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { id: "p1", name: "Test", price: 100, quantity: 2, category: "c", description: "d", images: ["x"] },
      ]),
    );

    let authState = { isAuthenticated: false, token: "" };
    mockUseUserAuth.mockImplementation(() => authState);

    const MergeHarness = () => {
      useCartMerge();
      return null;
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MergeHarness />
        </CartProvider>
      </QueryClientProvider>,
    );

    authState = { isAuthenticated: true, token: "tok" };
    rerender(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MergeHarness />
        </CartProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(cartApi.mergeCartRemote).toHaveBeenCalledTimes(1));
    expect(cartApi.mergeCartRemote).toHaveBeenCalledWith("tok", [{ productId: "p1", quantity: 2 }]);

    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]")).toEqual([]),
    );
  });

  it("waits for the token before merging, and never fires with an empty one", async () => {
    // Regression for the login-merge race found in E2E testing: the auth
    // context flips isAuthenticated true synchronously, then fetches the token
    // over the network. Firing on isAuthenticated alone sent the merge with an
    // empty token, the server 401'd, and the guest cart was lost. The merge
    // must hold until the token lands, then go out with it.
    // This describe's beforeEach re-stubs but doesn't reset call counts, so
    // clear the merge spy to make this test order-independent.
    cartApi.mergeCartRemote.mockClear();

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: "p3", name: "Test", price: 20, quantity: 3, category: "c", description: "d", images: ["x"] }]),
    );

    let authState = { isAuthenticated: false, token: "" };
    mockUseUserAuth.mockImplementation(() => authState);

    const MergeHarness = () => {
      useCartMerge();
      return null;
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = () => (
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MergeHarness />
        </CartProvider>
      </QueryClientProvider>
    );
    const { rerender } = render(tree());

    // Session established, token NOT yet fetched — the real gap.
    authState = { isAuthenticated: true, token: "" };
    rerender(tree());

    // Nothing must have gone out yet: an empty-token merge is the bug.
    expect(cartApi.mergeCartRemote).not.toHaveBeenCalled();

    // Token arrives from the profile round-trip.
    authState = { isAuthenticated: true, token: "real-tok" };
    rerender(tree());

    await waitFor(() => expect(cartApi.mergeCartRemote).toHaveBeenCalledTimes(1));
    expect(cartApi.mergeCartRemote).toHaveBeenCalledWith("real-tok", [{ productId: "p3", quantity: 3 }]);
  });

  it("does not merge again on a subsequent token refresh while still authenticated", async () => {
    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([{ id: "p2", name: "Test", price: 50, quantity: 1, category: "c", description: "d", images: ["x"] }]),
    );

    let authState = { isAuthenticated: true, token: "tok-1" };
    mockUseUserAuth.mockImplementation(() => authState);

    const MergeHarness = () => {
      useCartMerge();
      return null;
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MergeHarness />
        </CartProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(cartApi.mergeCartRemote).toHaveBeenCalledTimes(1));

    authState = { isAuthenticated: true, token: "tok-2" };
    rerender(
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <MergeHarness />
        </CartProvider>
      </QueryClientProvider>,
    );

    expect(cartApi.mergeCartRemote).toHaveBeenCalledTimes(1);
  });
});
