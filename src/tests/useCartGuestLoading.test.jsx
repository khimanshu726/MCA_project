import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CartItemCard from "../components/cart/CartItemCard.jsx";
import { CartProvider } from "../context/CartContext.jsx";
import { useCart } from "../hooks/useCart.js";
import * as productsApi from "../api/productsApi.js";

vi.mock("../context/UserAuthContext", () => ({
  useUserAuth: () => ({ isAuthenticated: false, token: "" }),
}));
vi.mock("../api/cartApi.js");
vi.mock("../api/productsApi.js");

const CART_STORAGE_KEY = "elite-empressions-cart-items-v2";

const storedLine = (overrides = {}) => ({
  id: "classic-card",
  name: "Classic Visiting Card",
  price: 18,
  category: "Visiting Cards",
  description: "350 gsm",
  images: ["card.jpg"],
  quantity: 200,
  ...overrides,
});

const liveCard = {
  id: "classic-card",
  name: "Classic Visiting Card",
  price: 18,
  mrp: 18,
  stock: 1000,
  minimumOrderQty: 100,
  status: "active",
  images: ["card.jpg"],
  category: "Visiting Cards",
};

const renderCart = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <CartProvider>{children}</CartProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useCart(), { wrapper });
};

// A listProducts call the test resolves by hand, to observe the cart while the
// product request is still in flight.
const deferredProducts = () => {
  let resolve;
  productsApi.listProducts.mockImplementation(
    () =>
      new Promise((res) => {
        resolve = res;
      }),
  );
  return (value) => resolve(value);
};

describe("useCart guest cart while products are loading", () => {
  beforeEach(() => {
    window.localStorage.clear();
    productsApi.listProducts.mockReset();
  });

  it("reports loading — not 'no longer available' and ₹0 — until the products arrive", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([storedLine()]));
    const respond = deferredProducts();

    const { result } = renderCart();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.items[0].isMissing).toBe(false);

    await act(async () => respond({ items: [liveCard], total: 1, page: 1, limit: 24 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items[0].isMissing).toBe(false);
    expect(result.current.items[0].isOutOfStock).toBe(false);
    expect(result.current.pricing.subtotal).toBe(3600);
  });

  it("marks a line missing only once the products have loaded without it", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([storedLine({ id: "deleted-product" })]));
    productsApi.listProducts.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24 });

    const { result } = renderCart();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items[0].isMissing).toBe(true);
    expect(result.current.items[0].lineTotal).toBe(0);
  });

  it("keeps an existing line's saved details while a newly added product is still loading", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([storedLine()]));
    productsApi.listProducts.mockResolvedValueOnce({ items: [liveCard], total: 1, page: 1, limit: 24 });

    const { result } = renderCart();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Adding a product changes the ids, so the next request is a new query that
    // starts out showing the previous result as placeholder data.
    const respond = deferredProducts();
    act(() => {
      result.current.addToCart({ id: "photo-mug", name: "Custom Photo Mug", price: 9, images: ["mug.jpg"] }, 6);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    const mug = result.current.items.find((item) => item.productId === "photo-mug");
    expect(mug.isMissing).toBe(false);
    expect(mug.lineTotal).toBe(54);
    // Placeholder data is still data: no full-page skeleton flash.
    expect(result.current.isLoading).toBe(false);

    await act(async () =>
      respond({
        items: [liveCard, { ...liveCard, id: "photo-mug", name: "Custom Photo Mug", price: 9, mrp: 9, minimumOrderQty: 6 }],
        total: 2,
        page: 1,
        limit: 24,
      }),
    );
    await waitFor(() =>
      expect(result.current.items.find((item) => item.productId === "photo-mug").product.stock).toBe(1000),
    );
  });

  it("stops loading if the products request fails, without calling the items unavailable", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([storedLine()]));
    productsApi.listProducts.mockRejectedValue(new Error("Network down"));

    const { result } = renderCart();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items[0].isMissing).toBe(false);
    expect(result.current.items[0].isAvailabilityUnknown).toBe(true);
    // The saved line has no MOQ; don't invent "MOQ 1".
    expect(result.current.items[0].product.minimumOrderQty).toBeNull();
  });
});

describe("CartItemCard with unknown availability", () => {
  const baseItem = {
    productId: "classic-card",
    quantity: 200,
    savedForLater: false,
    priceAtAdd: 18,
    product: { id: "classic-card", name: "Classic Visiting Card", price: 18, mrp: 18, images: ["card.jpg"], stock: 200, minimumOrderQty: null },
    isMissing: false,
    isOutOfStock: false,
    isLowStock: false,
    isPriceChanged: false,
    lineTotal: 3600,
  };

  const renderCard = (item) =>
    render(
      <MemoryRouter>
        <CartItemCard
          item={item}
          selected
          onToggleSelect={vi.fn()}
          onQuantityChange={vi.fn()}
          onRemove={vi.fn()}
          onToggleSaveForLater={vi.fn()}
          isAuthenticated={false}
        />
      </MemoryRouter>,
    );

  it("shows no stock badge and no MOQ badge while the live product is unknown", () => {
    renderCard({ ...baseItem, isAvailabilityUnknown: true });

    expect(screen.getByText("Classic Visiting Card")).toBeInTheDocument();
    expect(screen.queryByText("In stock")).not.toBeInTheDocument();
    expect(screen.queryByText(/MOQ/)).not.toBeInTheDocument();
    expect(screen.queryByText("This product is no longer available.")).not.toBeInTheDocument();
  });

  it("still shows the stock badge once availability is known", () => {
    renderCard(baseItem);

    expect(screen.getByText("In stock")).toBeInTheDocument();
  });
});
