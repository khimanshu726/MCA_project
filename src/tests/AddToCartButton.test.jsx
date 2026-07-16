import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AddToCartButton from "../components/AddToCartButton.jsx";

/**
 * The button used to have no idea whether a product was buyable: always
 * enabled, always reported "Added". That's how `launch-flyer` (stock 100,
 * MOQ 250) got into carts, where it priced at zero and blocked checkout.
 */
const addToCart = vi.fn();

vi.mock("../hooks/useCart", () => ({
  useCart: () => ({ addToCart, cartItemIds: new Set() }),
}));

const product = (overrides) => ({
  id: "p1",
  name: "Test Product",
  price: 35,
  stock: 1000,
  minimumOrderQty: 1,
  ...overrides,
});

describe("AddToCartButton", () => {
  beforeEach(() => {
    addToCart.mockReset();
    addToCart.mockResolvedValue(undefined);
  });

  it("refuses a product whose stock can't meet its own MOQ", async () => {
    render(<AddToCartButton product={product({ stock: 100, minimumOrderQty: 250 })} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Out of stock");

    fireEvent.click(button);
    expect(addToCart).not.toHaveBeenCalled();
  });

  it("refuses a product with zero stock", () => {
    render(<AddToCartButton product={product({ stock: 0 })} />);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent("Out of stock");
  });

  it("adds a full print run, not a single unit", async () => {
    render(<AddToCartButton product={product({ stock: 1000, minimumOrderQty: 250 })} />);

    fireEvent.click(screen.getByRole("button"));

    expect(addToCart).toHaveBeenCalledWith(expect.objectContaining({ id: "p1" }), 250);
  });

  it("confirms only after the add actually succeeds", async () => {
    render(<AddToCartButton product={product()} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Added"));
  });

  it("reports a failed add instead of claiming success", async () => {
    // The authenticated path is a server round-trip. This rejection used to be
    // swallowed by an unawaited promise while the button still said "Added".
    addToCart.mockRejectedValue(new Error("network down"));
    render(<AddToCartButton product={product()} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(screen.getByRole("button")).toHaveTextContent("Couldn't add"));
    expect(screen.getByRole("button")).not.toHaveTextContent("Added");
  });
});
