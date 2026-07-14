import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import CartItemCard from "../components/cart/CartItemCard.jsx";

const baseProduct = {
  id: "cards-1",
  name: "Classic Visiting Card",
  category: "Visiting Cards",
  images: ["https://example.com/image.jpg"],
  price: 100,
  mrp: 120,
  discountPercent: 17,
  stock: 10,
  leadTime: "Ready in 3-5 days",
  minimumOrderQty: 1,
};

const baseItem = {
  productId: "cards-1",
  quantity: 2,
  savedForLater: false,
  priceAtAdd: 100,
  product: baseProduct,
  isMissing: false,
  isOutOfStock: false,
  isLowStock: false,
  isPriceChanged: false,
  lineTotal: 200,
};

const renderCard = (overrides = {}, propOverrides = {}) => {
  const props = {
    item: { ...baseItem, ...overrides },
    selected: false,
    onToggleSelect: vi.fn(),
    onQuantityChange: vi.fn(),
    onRemove: vi.fn(),
    onToggleSaveForLater: vi.fn(),
    isAuthenticated: true,
    ...propOverrides,
  };

  render(
    <MemoryRouter>
      <CartItemCard {...props} />
    </MemoryRouter>,
  );

  return props;
};

describe("CartItemCard", () => {
  it("renders product details and quantity", () => {
    renderCard();

    expect(screen.getByText("Classic Visiting Card")).toBeInTheDocument();
    expect(screen.getByText("Visiting Cards")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("calls onQuantityChange with an absolute quantity when incremented", () => {
    const props = renderCard();

    fireEvent.click(screen.getByLabelText("Increase quantity"));

    expect(props.onQuantityChange).toHaveBeenCalledWith("cards-1", 3);
  });

  it("calls onRemove with the productId when Remove is clicked", () => {
    const props = renderCard();

    fireEvent.click(screen.getByText("Remove"));

    expect(props.onRemove).toHaveBeenCalledWith("cards-1");
  });

  it("disables the quantity selector and shows a badge when out of stock", () => {
    renderCard({ isOutOfStock: true });

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.getByLabelText("Increase quantity")).toBeDisabled();
    expect(screen.getByLabelText("Decrease quantity")).toBeDisabled();
  });

  it("shows a price-changed banner when the live price differs from priceAtAdd", () => {
    renderCard({ isPriceChanged: true, priceAtAdd: 80, product: { ...baseProduct, price: 100 } });

    expect(screen.getByText(/Price changed from/)).toBeInTheDocument();
  });

  it("hides the save-for-later toggle for guests", () => {
    renderCard({}, { isAuthenticated: false });

    expect(screen.queryByText("Save for later")).not.toBeInTheDocument();
  });

  it("calls onToggleSaveForLater when the save-for-later toggle is clicked", () => {
    const props = renderCard();

    fireEvent.click(screen.getByText("Save for later"));

    expect(props.onToggleSaveForLater).toHaveBeenCalledWith("cards-1", true);
  });

  it("renders a simplified unavailable state when the product is missing", () => {
    const props = renderCard({ isMissing: true, product: null });

    expect(screen.getByText("This product is no longer available.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Remove"));
    expect(props.onRemove).toHaveBeenCalledWith("cards-1");
  });
});
