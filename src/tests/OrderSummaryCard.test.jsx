import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import OrderSummaryCard from "../components/cart/OrderSummaryCard.jsx";

const basePricing = {
  subtotal: 200,
  mrpTotal: 240,
  discount: 40,
  platformFee: 15,
  tax: 10,
  shipping: 120,
  total: 345,
  savings: 40,
  currency: "INR",
};

const renderSummary = (overrides = {}) => {
  const props = {
    pricing: basePricing,
    itemCount: 2,
    onCheckout: vi.fn(),
    canCheckout: true,
    checkoutDisabledReason: "",
    isPlacingOrder: false,
    ...overrides,
  };

  render(
    <MemoryRouter>
      <OrderSummaryCard {...props} />
    </MemoryRouter>,
  );

  return props;
};

describe("OrderSummaryCard", () => {
  it("renders the full pricing breakdown", () => {
    renderSummary();

    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("₹200")).toBeInTheDocument();
    expect(screen.getByText("-₹40")).toBeInTheDocument();
    expect(screen.getByText("₹345")).toBeInTheDocument();
    expect(screen.getByText(/You.*re saving ₹40/)).toBeInTheDocument();
  });

  it("shows Free for zero shipping", () => {
    renderSummary({ pricing: { ...basePricing, shipping: 0 } });

    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("calls onCheckout when Place order is clicked and enabled", () => {
    const props = renderSummary();

    fireEvent.click(screen.getByText("Place order"));

    expect(props.onCheckout).toHaveBeenCalled();
  });

  it("disables Place order and shows the reason when checkout is blocked", () => {
    renderSummary({ canCheckout: false, checkoutDisabledReason: "Add delivery details to continue." });

    expect(screen.getByText("Place order")).toBeDisabled();
    expect(screen.getByText("Add delivery details to continue.")).toBeInTheDocument();
  });

  it("renders a disabled coupon input as a Phase 2 placeholder", () => {
    renderSummary();

    expect(screen.getByPlaceholderText("Coupon code (coming soon)")).toBeDisabled();
  });
});
