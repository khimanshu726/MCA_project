import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
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
  const bodyRows = () => screen.getAllByRole("row").slice(1);

  it("shows each quantity range with its price and saving, and marks the one in use", () => {
    render(<BulkPricingTable product={card} quantity={300} />);

    expect(screen.getByRole("heading", { name: "Buy more, save more" })).toBeInTheDocument();
    expect(screen.getByText(/Save up to/)).toHaveTextContent("Save up to 22%.");
    const rows = bodyRows();
    expect(rows.map((row) => row.querySelector("th").textContent)).toEqual(["100–249", "250–499Your price", "500+"]);
    expect(rows.map((row) => row.dataset.active)).toEqual(["false", "true", "false"]);
    expect(rows[0]).toHaveTextContent("₹18Starting price");
    expect(rows[1]).toHaveTextContent("₹1611% off₹2 less each");
    expect(rows[2]).toHaveTextContent("₹1422% off₹4 less each");
  });

  it("totals the order and spells out what the next range saves, in rupees", () => {
    render(<BulkPricingTable product={card} quantity={300} />);
    const summary = screen.getByRole("status");
    expect(summary).toHaveTextContent("300 × ₹16 = ₹4,800");
    // 500 at ₹14 instead of ₹16 each.
    expect(summary).toHaveTextContent("Order 200 more (500 total) and pay ₹14 each instead of ₹16: ₹1,000 off that order.");
  });

  it("lets a row or the nudge set the quantity, but not past what's in stock", () => {
    const onSelectQuantity = vi.fn();
    render(
      <BulkPricingTable product={card} quantity={100} onSelectQuantity={onSelectQuantity} maxQuantity={400} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Order 250 at ₹16 each" }));
    expect(onSelectQuantity).toHaveBeenLastCalledWith(250);
    fireEvent.click(screen.getByRole("button", { name: "Switch to 250" }));
    expect(onSelectQuantity).toHaveBeenCalledTimes(2);
    // 500+ is beyond the 400 in stock, so it can't be picked.
    expect(screen.queryByRole("button", { name: "Order 500 at ₹14 each" })).not.toBeInTheDocument();
  });

  it("says when the best price is reached, and what it saves", () => {
    render(<BulkPricingTable product={card} quantity={600} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You’re getting our best price: ₹2,400 less than at ₹18 each.",
    );
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
