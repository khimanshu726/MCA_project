import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import ProductPickerPanel from "../customizer/components/studio/ProductPickerPanel.jsx";

// Ported from ProductSelector.test.jsx. The picker replaced that component:
// it selected products through a panel portalled to document.body with
// position:fixed, which had no layout owner and so rendered across the
// canvas. The behaviour it guaranteed (search, select, empty state) still
// matters and is asserted here against the inspector-owned view.

const PRODUCTS = [
  {
    id: "classic-card",
    name: "Classic Visiting Card",
    category: "Visiting Cards",
    price: 18,
    images: [],
    badge: "Best Seller",
    featured: true,
  },
  { id: "storefront-banner", name: "Storefront Banner", category: "Banners", price: 79, images: [] },
  { id: "photo-mug", name: "Custom Photo Mug", category: "Photo Gifts", price: 9, images: [] },
];

const renderPicker = (overrides = {}) => {
  const props = {
    products: PRODUCTS,
    value: "storefront-banner",
    isLoading: false,
    onSelect: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<ProductPickerPanel {...props} />);
  return props;
};

describe("ProductPickerPanel", () => {
  it("lists every product with its price and category", () => {
    renderPicker();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(within(options[0]).getByText("Classic Visiting Card")).toBeInTheDocument();
    expect(within(options[0]).getByText("Visiting Cards")).toBeInTheDocument();
    expect(within(options[0]).getByText(/18/)).toBeInTheDocument();
  });

  it("marks the current product as selected", () => {
    renderPicker();

    const selected = screen.getAllByRole("option").filter((o) => o.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(within(selected[0]).getByText("Storefront Banner")).toBeInTheDocument();
  });

  it("filters by name and by category", () => {
    renderPicker();
    const search = screen.getByLabelText("Search products");

    fireEvent.change(search, { target: { value: "mug" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText("Custom Photo Mug")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "banners" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByText("Storefront Banner")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    renderPicker();

    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "zzzz" } });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No products found")).toBeInTheDocument();
  });

  it("reports the chosen product id", () => {
    const props = renderPicker();

    fireEvent.click(screen.getByText("Custom Photo Mug"));

    expect(props.onSelect).toHaveBeenCalledWith("photo-mug");
  });

  it("can be dismissed without selecting", () => {
    const props = renderPicker();

    fireEvent.click(screen.getByLabelText("Back to product properties"));

    expect(props.onBack).toHaveBeenCalled();
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it("renders skeletons while the product list loads", () => {
    renderPicker({ isLoading: true });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("never portals outside its container", () => {
    const { baseElement, container } = render(
      <ProductPickerPanel products={PRODUCTS} value="photo-mug" onSelect={vi.fn()} onBack={vi.fn()} />,
    );

    // Everything the picker renders must live inside the element it was
    // mounted into — that containment is the whole point of the rewrite.
    for (const option of within(baseElement).getAllByRole("option")) {
      expect(container.contains(option)).toBe(true);
    }
  });
});
