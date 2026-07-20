import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import OrderSummaryCard from "../components/cart/OrderSummaryCard.jsx";

const basePricing = {
  subtotal: 200,
  mrpTotal: 240,
  discount: 40,
  couponCode: null,
  couponDiscount: 0,
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
    isAuthenticated: true,
    isApplyingCoupon: false,
    onApplyCoupon: vi.fn().mockResolvedValue(undefined),
    onRemoveCoupon: vi.fn(),
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

  it("renders a coupon input for an authenticated user", () => {
    renderSummary();

    expect(screen.getByPlaceholderText("Coupon code")).toBeInTheDocument();
  });

  it("prompts sign-in instead of a coupon input for guests", () => {
    renderSummary({ isAuthenticated: false });

    expect(screen.queryByPlaceholderText("Coupon code")).not.toBeInTheDocument();
    expect(screen.getByText(/to apply a coupon code/)).toBeInTheDocument();
  });

  it("calls onApplyCoupon with the trimmed code on submit", async () => {
    const props = renderSummary();

    fireEvent.change(screen.getByPlaceholderText("Coupon code"), { target: { value: "  save10  " } });
    fireEvent.click(screen.getByText("Apply"));

    expect(props.onApplyCoupon).toHaveBeenCalledWith("save10");
  });

  it("shows the applied coupon with a remove action instead of the input", () => {
    const props = renderSummary({ pricing: { ...basePricing, couponCode: "SAVE10", couponDiscount: 20 } });

    expect(screen.getByText("SAVE10 applied")).toBeInTheDocument();
    expect(screen.getByText(`-${"₹20"}`)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Remove"));
    expect(props.onRemoveCoupon).toHaveBeenCalled();
  });

  it("shows an inline error when applying a coupon fails", async () => {
    const props = renderSummary({
      onApplyCoupon: vi.fn().mockRejectedValue(new Error("This coupon has expired.")),
    });

    fireEvent.change(screen.getByPlaceholderText("Coupon code"), { target: { value: "OLD" } });
    fireEvent.click(screen.getByText("Apply"));

    expect(await screen.findByText("This coupon has expired.")).toBeInTheDocument();
    expect(props.onApplyCoupon).toHaveBeenCalledWith("OLD");
  });
});
