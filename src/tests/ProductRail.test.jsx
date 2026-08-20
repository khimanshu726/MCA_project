import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import ProductRail from "../components/cart/ProductRail.jsx";

// ProductRailCard drags in the cart/auth stack (AddToCartButton → useCart); the
// rail's own behaviour is what's under test, so it's stubbed to something
// identifiable.
vi.mock("../components/cart/ProductRailCard", () => ({
  default: ({ product }) => <div data-testid="rail-tile">{product.name}</div>,
}));

describe("ProductRail", () => {
  it("renders the title and one tile per product", () => {
    render(
      <ProductRail
        title="Frequently bought together"
        products={[
          { id: "a", name: "Alpha" },
          { id: "b", name: "Beta" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: /frequently bought together/i })).toBeInTheDocument();
    expect(screen.getAllByTestId("rail-tile")).toHaveLength(2);
  });

  it("renders nothing when there are no products", () => {
    const { container } = render(<ProductRail title="You may also like" products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
