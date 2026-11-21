import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BulkPricingTable from "../components/BulkPricingTable";
import CartItemCard from "../components/cart/CartItemCard";
import { CartProvider } from "../context/CartContext.jsx";
import { useCart } from "../hooks/useCart.js";
import * as productsApi from "../api/productsApi.js";

vi.mock("../context/UserAuthContext", () => ({
  useUserAuth: () => ({ isAuthenticated: false, token: "" }),
}));
vi.mock("../api/cartApi.js");
vi.mock("../api/productsApi.js");

const card = {
  id: "tier-card",
  name: "Tier Card",
  category: "Visiting Cards",
  images: ["card.jpg"],
  price: 18,
  mrp: 18,
  stock: 5000,
  minimumOrderQty: 100,
  status: "active",
  priceTiers: [
    { minQty: 250, price: 16 },
    { minQty: 500, price: 14 },
  ],
};

describe("BulkPricingTable", () => {
  it("lists every break, highlights the one in use, and nudges to the next", () => {
    render(<BulkPricingTable product={card} quantity={300} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["100+ · ₹18 each", "250+ · ₹16 each", "500+ · ₹14 each"]);
    expect(rows.map((row) => row.dataset.active)).toEqual(["false", "true", "false"]);
    expect(screen.getByText(/Order 500\+ to pay ₹14 each/)).toBeInTheDocument();
  });

  it("says when the best price is reached", () => {
    render(<BulkPricingTable product={card} quantity={500} />);
    expect(screen.getByText(/best bulk price/)).toBeInTheDocument();
  });

  it("renders nothing for a product without tiers", () => {
    const { container } = render(<BulkPricingTable product={{ ...card, priceTiers: [] }} quantity={300} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("CartItemCard with volume pricing", () => {
  const renderLine = (quantity, unitPrice) =>
    render(
      <MemoryRouter>
        <CartItemCard
          item={{
            productId: card.id,
            quantity,
            unitPrice,
            product: card,
            savedForLater: false,
            isMissing: false,
            isOutOfStock: false,
            isLowStock: false,
            isPriceChanged: false,
            lineTotal: unitPrice * quantity,
          }}
          selected
          onToggleSelect={vi.fn()}
          onQuantityChange={vi.fn()}
          onRemove={vi.fn()}
          onToggleSaveForLater={vi.fn()}
          isAuthenticated={false}
        />
      </MemoryRouter>,
    );

  it("shows the tier unit price and says the bulk price applies", () => {
    renderLine(300, 16);
    expect(screen.getByText("₹16")).toBeInTheDocument();
    expect(screen.getByText(/Bulk price applied/)).toBeInTheDocument();
    expect(screen.getByText(/Add 200 more to pay ₹14 each/)).toBeInTheDocument();
  });

  it("nudges toward the first break at the base price", () => {
    renderLine(100, 18);
    expect(screen.queryByText(/Bulk price applied/)).not.toBeInTheDocument();
    expect(screen.getByText(/Add 150 more to pay ₹16 each/)).toBeInTheDocument();
  });
});

describe("guest cart totals use the tier price", () => {
  beforeEach(() => {
    window.localStorage.clear();
    productsApi.listProducts.mockReset();
  });

  it("charges 300 units at the 250+ price", async () => {
    window.localStorage.setItem(
      "elite-empressions-cart-items-v2",
      JSON.stringify([{ id: card.id, name: card.name, price: 18, images: card.images, quantity: 300 }]),
    );
    productsApi.listProducts.mockResolvedValue({ items: [card], total: 1, page: 1, limit: 24 });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <CartProvider>{children}</CartProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items[0].unitPrice).toBe(16);
    expect(result.current.items[0].lineTotal).toBe(4800);
    expect(result.current.pricing.subtotal).toBe(4800);
    // The flat shape the checkout review page shows.
    expect(result.current.cartItems[0].price).toBe(16);
  });
});
