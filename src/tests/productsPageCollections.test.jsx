import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const suite = {
  id: "col-1",
  slug: "wedding-invitation-suite",
  name: "Wedding Invitation Suite",
  category: "Wedding Cards",
  coverImage: "https://example.com/red-card.jpg",
  productCount: 2,
  minPrice: 32,
};
const designs = [
  { id: "d1", name: "Fancy Red and Golden Card", category: "Wedding Cards", collectionId: "col-1" },
  { id: "d2", name: "Classic Suite", category: "Invitations", collectionId: "col-1" },
];

const productCalls = [];
vi.mock("../hooks/useProducts", () => ({
  useProducts: (filters) => {
    productCalls.push(filters);
    // The page's main listing asks for limit 100 with a category; the chip-row query has neither.
    const items = filters.withCollectionDesigns ? designs : [];
    return { data: { items }, isLoading: false, isError: false, refetch: vi.fn() };
  },
}));
vi.mock("../hooks/useCollections", () => ({
  useCollections: ({ enabled } = {}) => ({ data: enabled === false ? undefined : [suite] }),
}));
vi.mock("../components/ProductCard", () => ({
  default: ({ product }) => <article data-testid="design">{product.name}</article>,
}));
vi.mock("../components/CollectionCard", () => ({
  default: ({ collection }) => <article data-testid="collection-card">{collection.name}</article>,
}));
vi.mock("../components/Seo", () => ({ default: () => null }));

import ProductsPage from "../pages/ProductsPage";

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ProductsPage />
    </MemoryRouter>,
  );

describe("the products page with collections", () => {
  beforeEach(() => {
    productCalls.length = 0;
  });

  it("lists every design on a category page, with no collection banner or card", () => {
    renderAt("/products?category=Wedding%20Cards");

    expect(productCalls).toContainEqual(
      expect.objectContaining({ category: "Wedding Cards", withCollectionDesigns: true, excludeCollected: false }),
    );
    expect(screen.getAllByTestId("design").map((card) => card.textContent)).toEqual([
      "Fancy Red and Golden Card",
      "Classic Suite",
    ]);
    expect(screen.queryByTestId("collection-card")).not.toBeInTheDocument();

    expect(screen.queryByRole("link", { name: /Wedding Invitation Suite/ })).not.toBeInTheDocument();
    expect(document.querySelector(".collection-banner-list")).toBeNull();
    expect(document.querySelector(".listing-facts")).toHaveTextContent("2 results");
    expect(document.querySelector(".results-summary")).toBeNull();
  });

  it("keeps one card per collection on All products", () => {
    renderAt("/products");
    expect(productCalls).toContainEqual(
      expect.objectContaining({ category: "All", excludeCollected: true, withCollectionDesigns: false }),
    );
    expect(screen.getByTestId("collection-card")).toHaveTextContent("Wedding Invitation Suite");
    expect(screen.queryByRole("link", { name: /Browse collection/ })).not.toBeInTheDocument();
  });

  it("shows no collections while searching", () => {
    renderAt("/products?category=Wedding%20Cards&q=red");
    expect(productCalls).toContainEqual(expect.objectContaining({ q: "red", withCollectionDesigns: false }));
    expect(screen.queryByTestId("collection-card")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Browse collection/ })).not.toBeInTheDocument();
  });
});

describe("one category list", () => {
  const typed = [
    { id: "a", name: "Royal Red", category: "Wedding Cards", designType: "Royal" },
    { id: "b", name: "Royal Gold", category: "Wedding Cards", designType: "Royal" },
    { id: "c", name: "Floral Bloom", category: "Wedding Cards", designType: "Floral" },
  ];

  beforeEach(() => {
    productCalls.length = 0;
    designs.splice(0, designs.length, ...typed);
  });

  it("titles a category page with its customer-facing name, compactly, without a breadcrumb or category chips", () => {
    renderAt("/products?category=Visiting%20Cards");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Business Cards");
    expect(screen.queryByRole("navigation", { name: "Breadcrumb" })).not.toBeInTheDocument();
    // Search and sort share one slim row, with no toolbar card.
    const bar = document.querySelector(".listing-bar");
    expect(bar).toContainElement(screen.getByLabelText("Search catalog"));
    expect(bar).toContainElement(screen.getByLabelText("Sort by"));
    expect(document.querySelector(".catalog-toolbar")).toBeNull();
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Catalog categories" })).not.toBeInTheDocument();
  });

  it("narrows a category by design type", async () => {
    const { fireEvent } = await import("@testing-library/react");
    renderAt("/products?category=Wedding%20Cards");
    const types = screen.getByRole("group", { name: "Design types" });
    expect(types).toHaveTextContent("All 3Royal 2Floral 1");

    fireEvent.click(screen.getByRole("button", { name: /^Floral/ }));
    expect(screen.getAllByTestId("design").map((card) => card.textContent)).toEqual(["Floral Bloom"]);
    expect(document.querySelector(".listing-facts")).toHaveTextContent("1 result · Floral");
  });

  it("offers a Category dropdown on All products, in the header's order and names", () => {
    renderAt("/products");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("All products");
    // The chip-row query returns nothing in this mock, so only "All categories" is listed.
    expect(screen.getByLabelText("Category")).toHaveDisplayValue("All categories");
  });
});

describe("categoryOptionsFromItems", () => {
  it("lists categories that have products, in the header's order, under customer names", async () => {
    const { categoryOptionsFromItems } = await import("../pages/ProductsPage");
    expect(
      categoryOptionsFromItems([
        { category: "Institutional Supplies" },
        { category: "Wedding Cards" },
        { category: "Visiting Cards" },
        { category: "Visiting Cards" },
        { category: "Photo Frames" },
      ]),
    ).toEqual([
      { value: "Visiting Cards", label: "Business Cards" },
      { value: "Wedding Cards", label: "Wedding Cards" },
      { value: "Institutional Supplies", label: "Institutions" },
      { value: "Photo Frames", label: "Photo Frames" },
    ]);
  });
});
