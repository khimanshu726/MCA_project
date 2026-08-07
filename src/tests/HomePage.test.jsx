import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage.jsx";
import { categories } from "../data";

const mockUseProducts = vi.fn();

vi.mock("../hooks/useProducts", () => ({ useProducts: (f) => mockUseProducts(f) }));
// ProductCard pulls in the cart/auth stack; the homepage's own behaviour is
// what's under test, so it's stubbed down to something identifiable.
vi.mock("../components/ProductCard", () => ({
  default: ({ product }) => <div data-testid="product-card">{product.name}</div>,
}));

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

const success = (items) => ({ data: { items }, isLoading: false, isFetching: false, refetch: vi.fn() });

describe("HomePage — shop by category", () => {
  beforeEach(() => {
    mockUseProducts.mockReturnValue(success([{ id: "p1", name: "Classic Visiting Card" }]));
  });

  it("links every category card to its category listing, not a single product", () => {
    // Regression for the defect where a card titled "Visiting Cards" opened
    // /products/classic-card — one hardcoded product's detail page — under a
    // heading promising a browsable category.
    const { container } = renderHome();
    // Scoped to the category grid: some of these words also appear in links
    // elsewhere on the page (the essentials CTAs), and a page-wide query would
    // match those too.
    const grid = container.querySelector(".category-grid");
    const hrefs = [...grid.querySelectorAll("a")].map((a) => a.getAttribute("href"));

    expect(hrefs).toHaveLength(categories.length);

    categories.forEach((category) => {
      const expected = `/products?category=${encodeURIComponent(category.searchCategory)}`;
      expect(hrefs).toContain(expected);
    });

    // None of them may be a bare product-detail path — the shape of the bug.
    hrefs.forEach((href) => {
      expect(href).toContain("/products?category=");
      expect(href).not.toMatch(/^\/products\/[^?]+$/);
    });
  });

  it("encodes category names containing characters that would break the query string", () => {
    const { container } = renderHome();

    const ampersandCategory = categories.find((c) => c.searchCategory.includes("&"));
    expect(ampersandCategory).toBeTruthy();

    const hrefs = [...container.querySelectorAll(".category-grid a")].map((a) => a.getAttribute("href"));
    const target = hrefs.find((h) => h.includes(encodeURIComponent(ampersandCategory.searchCategory)));

    // A raw "&" would truncate the parameter and silently filter by the wrong
    // category — "Labels " rather than "Labels & Packaging".
    expect(target).toBeTruthy();
    expect(target).toContain("%26");
  });

  it("points every card at a category the catalog data actually defines", () => {
    categories.forEach((category) => {
      expect(category.searchCategory).toBeTruthy();
      expect(category.searchCategory).toBe(category.title);
    });
  });
});

describe("HomePage — popular products states", () => {
  it("renders the products when the query succeeds", () => {
    mockUseProducts.mockReturnValue(success([{ id: "p1", name: "Classic Visiting Card" }]));
    renderHome();

    expect(screen.getAllByTestId("product-card")).toHaveLength(1);
    expect(screen.queryByText(/couldn.t load popular products/i)).not.toBeInTheDocument();
  });

  it("shows a loading message while the query is pending", () => {
    mockUseProducts.mockReturnValue({ data: undefined, isLoading: true, isFetching: true, refetch: vi.fn() });
    renderHome();

    expect(screen.getByText(/loading popular products/i)).toBeInTheDocument();
  });

  it("explains itself when the query never returned an answer", () => {
    // The defect: a paused/indeterminate query reports neither isError nor
    // isLoading, so the old three-way branch fell through to success and
    // rendered an empty grid — indistinguishable from "no best-sellers exist".
    mockUseProducts.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, refetch: vi.fn() });
    renderHome();

    expect(screen.getByText(/couldn.t load popular products/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId("product-card")).toHaveLength(0);
  });

  it("offers a retry that actually refetches", () => {
    const refetch = vi.fn();
    mockUseProducts.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, refetch });
    renderHome();

    screen.getByRole("button", { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("disables the retry while a retry is in flight", () => {
    mockUseProducts.mockReturnValue({ data: undefined, isLoading: false, isFetching: true, refetch: vi.fn() });
    renderHome();

    expect(screen.getByRole("button", { name: /retrying/i })).toBeDisabled();
  });

  it("distinguishes 'nothing is featured' from 'we couldn't reach the server'", () => {
    // An answer that legitimately contains nothing is not an outage. Telling
    // someone we couldn't load anything when an admin has simply unfeatured
    // every product would be false.
    mockUseProducts.mockReturnValue(success([]));
    renderHome();

    expect(screen.getByText(/no products are featured right now/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn.t load popular products/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });

  it("never renders a bare empty grid in any non-success state", () => {
    for (const state of [
      { data: undefined, isLoading: false, isFetching: false, refetch: vi.fn() },
      { data: { items: [] }, isLoading: false, isFetching: false, refetch: vi.fn() },
    ]) {
      mockUseProducts.mockReturnValue(state);
      const { container, unmount } = renderHome();

      const grid = container.querySelector(".product-grid");
      // The exact shape of the original defect: <div class="product-grid"></div>
      // with nothing inside and nothing said.
      expect(grid).toBeNull();
      unmount();
    }
  });
});
