import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";
import ProductSelector from "../components/ProductSelector";

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
  {
    id: "storefront-banner",
    name: "Storefront Banner",
    category: "Banners",
    price: 79,
    images: [],
    featured: false,
  },
  {
    id: "photo-mug",
    name: "Custom Photo Mug",
    category: "Photo Gifts",
    price: 9,
    images: [],
    featured: false,
  },
];

const renderSelector = (overrides = {}) => {
  const props = {
    products: PRODUCTS,
    value: "storefront-banner",
    onChange: vi.fn(),
    label: "Product",
    ...overrides,
  };
  render(<ProductSelector {...props} />);
  return props;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProductSelector", () => {
  it("shows the selected product's name and category in the closed trigger", () => {
    renderSelector();
    const trigger = screen.getByRole("combobox", { name: /product/i });
    expect(within(trigger).getByText("Storefront Banner")).toBeInTheDocument();
    expect(within(trigger).getByText("Banners")).toBeInTheDocument();
  });

  it("opens the panel with a search field on click and lists all products", () => {
    renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));

    expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /classic visiting card/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /custom photo mug/i })).toBeInTheDocument();
  });

  it("filters the list as the user types, case-insensitively", () => {
    renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));
    const search = screen.getByPlaceholderText(/search products/i);

    fireEvent.change(search, { target: { value: "MUG" } });

    expect(screen.getByRole("option", { name: /custom photo mug/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /classic visiting card/i })).not.toBeInTheDocument();
  });

  it("shows the empty state when no product matches the search", () => {
    renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));
    fireEvent.change(screen.getByPlaceholderText(/search products/i), { target: { value: "zzz-no-match" } });

    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });

  it("selects a product on click and closes the panel", () => {
    const props = renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));
    fireEvent.mouseDown(screen.getByRole("option", { name: /custom photo mug/i }));

    expect(props.onChange).toHaveBeenCalledWith("photo-mug");
    expect(screen.queryByPlaceholderText(/search products/i)).not.toBeInTheDocument();
  });

  it("navigates and selects with the keyboard (ArrowDown then Enter)", () => {
    const props = renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));
    const search = screen.getByPlaceholderText(/search products/i);

    // Selected product (storefront-banner) is index 0 on open; ArrowDown
    // moves to the next option in DOM order.
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    expect(props.onChange).toHaveBeenCalled();
  });

  it("closes on Escape without changing the selection", () => {
    const props = renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));
    fireEvent.keyDown(screen.getByPlaceholderText(/search products/i), { key: "Escape" });

    expect(screen.queryByPlaceholderText(/search products/i)).not.toBeInTheDocument();
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("shows a Popular section with featured products when idle", () => {
    renderSelector();
    fireEvent.click(screen.getByRole("combobox", { name: /product/i }));

    expect(screen.getByRole("group", { name: /popular/i })).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: /popular/i })).getByText("Classic Visiting Card")).toBeInTheDocument();
  });

  it("shows a loading skeleton and disables opening while isLoading", () => {
    renderSelector({ isLoading: true, value: "" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
