import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InstitutionsPage from "../pages/InstitutionsPage.jsx";

const mockUseProducts = vi.fn();
vi.mock("../hooks/useProducts", () => ({ useProducts: (f) => mockUseProducts(f) }));
// ProductCard drags in cart/auth context; the page's own behaviour is under test.
vi.mock("../components/ProductCard", () => ({
  default: ({ product }) => <div data-testid="product-card">{product.name}</div>,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <InstitutionsPage />
    </MemoryRouter>,
  );

const success = (items) => ({ data: { items }, isLoading: false, isFetching: false, refetch: vi.fn() });

describe("InstitutionsPage", () => {
  it("queries the Institutional Supplies category and renders its products", () => {
    mockUseProducts.mockReturnValue(success([{ id: "attendance-register", name: "Attendance Register" }]));
    renderPage();

    expect(mockUseProducts).toHaveBeenCalledWith(expect.objectContaining({ category: "Institutional Supplies" }));
    expect(screen.getByRole("heading", { level: 2, name: /academic year/i })).toBeInTheDocument();
    expect(screen.getByTestId("product-card")).toHaveTextContent("Attendance Register");
  });

  it("points the browse CTA at the encoded category filter and the quote CTA at #quote", () => {
    mockUseProducts.mockReturnValue(success([{ id: "question-papers", name: "Question Papers" }]));
    const { container } = renderPage();

    const browse = screen.getAllByRole("link", { name: /browse all supplies|browse supplies|view in catalog/i })[0];
    expect(browse).toHaveAttribute("href", "/products?category=Institutional%20Supplies");

    const quote = screen.getByRole("link", { name: /request a bulk quote/i });
    expect(quote).toHaveAttribute("href", "#quote");
    // The quote section anchor exists so the CTA is never a dead link.
    expect(container.querySelector("#quote")).toBeTruthy();
  });

  it("shows a retry when the catalog query returns no answer (outage), not an empty grid", () => {
    const refetch = vi.fn();
    mockUseProducts.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, refetch });
    renderPage();

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByTestId("product-card")).not.toBeInTheDocument();
  });

  it("shows a coming-soon empty state (not a blank grid) when the category is legitimately empty", () => {
    mockUseProducts.mockReturnValue(success([]));
    renderPage();

    expect(screen.getByText(/being added/i)).toBeInTheDocument();
    expect(screen.queryByTestId("product-card")).not.toBeInTheDocument();
  });
});
