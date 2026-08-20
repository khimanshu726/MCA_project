import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MobileCheckoutBar from "../components/cart/MobileCheckoutBar.jsx";

describe("MobileCheckoutBar", () => {
  it("shows the total and item count and routes to checkout when tapped", () => {
    const onCheckout = vi.fn();
    render(
      <MobileCheckoutBar total={2499} itemCount={3} canCheckout onCheckout={onCheckout} disabledReason="" />,
    );

    expect(screen.getByText(/total \(3 items\)/i)).toBeInTheDocument();
    expect(screen.getByText("₹2,499")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /proceed to checkout/i }));
    expect(onCheckout).toHaveBeenCalledTimes(1);
  });

  it("disables the CTA and explains why when checkout isn't possible", () => {
    const onCheckout = vi.fn();
    render(
      <MobileCheckoutBar
        total={0}
        itemCount={0}
        canCheckout={false}
        onCheckout={onCheckout}
        disabledReason="Add at least one available product to continue."
      />,
    );

    const cta = screen.getByRole("button", { name: /proceed to checkout/i });
    expect(cta).toBeDisabled();
    expect(screen.getByText(/add at least one available product/i)).toBeInTheDocument();

    fireEvent.click(cta);
    expect(onCheckout).not.toHaveBeenCalled();
  });
});
