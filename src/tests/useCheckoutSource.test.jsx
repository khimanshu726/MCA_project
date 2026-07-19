import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCheckoutSource } from "../hooks/useCheckoutSource";
import { storeBuyNowSession, loadBuyNowSession } from "../utils/buyNowSession";

const mockUseCart = vi.fn();
const mockUseUserAuth = vi.fn();

vi.mock("../hooks/useCart", () => ({ useCart: () => mockUseCart() }));
vi.mock("../context/UserAuthContext", () => ({ useUserAuth: () => mockUseUserAuth() }));
vi.mock("../api/productsApi", () => ({
  getProduct: vi.fn(async (id) => ({
    product: {
      id,
      name: "Visiting Card",
      price: 79,
      mrp: 99,
      stock: 500,
      minimumOrderQty: 1,
      status: "active",
      images: ["a.jpg"],
      category: "Cards",
      description: "d",
    },
  })),
}));

const clearCartSpy = vi.fn();

const Probe = () => {
  const source = useCheckoutSource();
  return (
    <div>
      <span data-testid="source">{source.source}</span>
      <span data-testid="count">{source.items.length}</span>
      <span data-testid="editable">{String(source.isEditableQuantity)}</span>
      <span data-testid="redirect">{source.emptyRedirect}</span>
      <span data-testid="qty">{source.quantity ?? "-"}</span>
      <span data-testid="total">{source.pricing.total}</span>
      <span data-testid="exceeds">{String(source.exceedsStock)}</span>
      <span data-testid="pricechanged">{String(source.priceChanged)}</span>
      <span data-testid="max">{source.maxQuantity ?? "-"}</span>
      <button data-testid="clear" onClick={() => source.clearSource()}>
        clear
      </button>
    </div>
  );
};

const renderProbe = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
};

describe("useCheckoutSource", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearCartSpy.mockClear();
    mockUseUserAuth.mockReturnValue({ isAuthenticated: true, token: "tok" });
    mockUseCart.mockReturnValue({
      items: [{ productId: "cart-item", quantity: 2, savedForLater: false, product: { price: 100, mrp: 100 } }],
      cartItems: [{ id: "cart-item", name: "From cart", price: 100, quantity: 2 }],
      pricing: { total: 999, subtotal: 200, couponCode: null },
      isLoading: false,
      isAuthenticated: true,
      clearCart: clearCartSpy,
      applyCoupon: vi.fn(),
      removeCoupon: vi.fn(),
      couponError: null,
      isApplyingCoupon: false,
    });
  });

  it("falls back to the cart when there is no Buy Now session", async () => {
    renderProbe();

    expect(screen.getByTestId("source").textContent).toBe("cart");
    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByTestId("editable").textContent).toBe("false");
    expect(screen.getByTestId("redirect").textContent).toBe("/cart");
  });

  it("prefers an active Buy Now session over the cart", async () => {
    storeBuyNowSession({ productId: "p1", quantity: 3, unitPriceAtStart: 79 });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("source").textContent).toBe("buynow"));
    // The line only materializes once the live product resolves — until then
    // the source reports isLoading, which is what stops the checkout guard
    // from bouncing a refreshed Buy Now back to the product list.
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));

    expect(screen.getByTestId("qty").textContent).toBe("3");
    expect(screen.getByTestId("editable").textContent).toBe("true");
    expect(screen.getByTestId("redirect").textContent).toBe("/products");
  });

  it("prices the Buy Now line from live product data, not the cart's total", async () => {
    storeBuyNowSession({ productId: "p1", quantity: 2, unitPriceAtStart: 79 });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("source").textContent).toBe("buynow"));

    // 79 x 2 = 158 subtotal, + 15 platform + 5% tax + 120 shipping = 300.9.
    // Crucially NOT the cart's 999.
    await waitFor(() => expect(Number(screen.getByTestId("total").textContent)).toBeCloseTo(300.9, 2));
  });

  it("completing a Buy Now clears the session and leaves the cart alone", async () => {
    storeBuyNowSession({ productId: "p1", quantity: 1 });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("source").textContent).toBe("buynow"));

    await act(async () => {
      screen.getByTestId("clear").click();
    });

    expect(loadBuyNowSession()).toBeNull();
    // The heart of the feature: a Buy Now purchase must never empty the
    // customer's cart. If this ever fires, Buy Now is silently destroying
    // a basket the customer curated separately.
    expect(clearCartSpy).not.toHaveBeenCalled();
  });

  it("completing a cart checkout clears the cart", async () => {
    renderProbe();

    await act(async () => {
      screen.getByTestId("clear").click();
    });

    expect(clearCartSpy).toHaveBeenCalledTimes(1);
  });

  it("flags a quantity that exceeds live stock", async () => {
    // Stock is 500 in the mocked product. A session written with more than
    // that (tampering, or stock dropping mid-checkout) must be caught before
    // the payment step — the order endpoint would reject it anyway, but only
    // after the customer has been through a payment modal.
    storeBuyNowSession({ productId: "p1", quantity: 900 });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("exceeds").textContent).toBe("true"));
    expect(screen.getByTestId("max").textContent).toBe("500");
  });

  it("flags a price change between clicking Buy Now and reaching checkout", async () => {
    // Customer clicked at 60; the live product now costs 79.
    storeBuyNowSession({ productId: "p1", quantity: 1, unitPriceAtStart: 60 });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("pricechanged").textContent).toBe("true"));
  });

  it("does not flag a price change when the price is unchanged", async () => {
    storeBuyNowSession({ productId: "p1", quantity: 1, unitPriceAtStart: 79 });
    renderProbe();

    await waitFor(() => expect(screen.getByTestId("source").textContent).toBe("buynow"));
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("1"));
    expect(screen.getByTestId("pricechanged").textContent).toBe("false");
  });

  it("treats an expired Buy Now session as a cart checkout, and says so", async () => {
    storeBuyNowSession({ productId: "p1", quantity: 1 });
    // Advance past the TTL.
    const realNow = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(realNow + 31 * 60 * 1000);

    renderProbe();

    expect(screen.getByTestId("source").textContent).toBe("cart");
    Date.now.mockRestore();
  });
});
