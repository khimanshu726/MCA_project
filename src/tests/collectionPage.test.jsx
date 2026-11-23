import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const collection = {
  id: "col-1",
  slug: "wedding-invitation-suite",
  name: "Wedding Invitation Suite",
  description: "Every wedding card design.",
  coverImage: "https://example.com/cover.jpg",
  minPrice: 75,
  category: "Invitations",
  productCount: 3,
};

const designs = [
  { id: "d1", name: "Royal Rose", designType: "Royal", price: 120, category: "Wedding Cards", images: [] },
  { id: "d2", name: "Royal Gold", designType: "Royal", price: 140, category: "Wedding Cards", images: [] },
  { id: "d3", name: "Floral Bloom", designType: "Floral", price: 75, category: "Wedding Cards", images: [] },
];

vi.mock("../hooks/useCollections", () => ({
  useCollection: () => ({ data: collection, isLoading: false, isError: false }),
}));
vi.mock("../hooks/useProducts", () => ({
  useProducts: () => ({ data: { items: designs }, isLoading: false, isError: false, refetch: vi.fn() }),
}));
// Cards are covered by their own tests; a stub keeps this one about the page.
vi.mock("../components/ProductCard", () => ({
  default: ({ product }) => <article data-testid="design">{product.name}</article>,
}));

import CollectionPage, { designTypeCounts } from "../pages/CollectionPage";

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/collections/:slug" element={<CollectionPage />} />
      </Routes>
    </MemoryRouter>,
  );

const shownDesigns = () => screen.getAllByTestId("design").map((card) => card.textContent);

describe("collection page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts design types, most common first", () => {
    expect(designTypeCounts(designs)).toEqual([
      { type: "Royal", count: 2 },
      { type: "Floral", count: 1 },
    ]);
  });

  it("shows every design with a chip per type and its count", () => {
    renderAt("/collections/wedding-invitation-suite");

    expect(screen.getByRole("heading", { level: 1, name: "Wedding Invitation Suite" })).toBeInTheDocument();
    expect(shownDesigns()).toHaveLength(3);
    const chips = within(screen.getByRole("group", { name: "Design types" })).getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual(["All 3", "Royal 2", "Floral 1"]);
  });

  it("narrows to one type when its chip is picked", () => {
    renderAt("/collections/wedding-invitation-suite");

    fireEvent.click(screen.getByRole("button", { name: "Floral 1" }));
    expect(shownDesigns()).toEqual(["Floral Bloom"]);
    expect(screen.getByRole("button", { name: "Floral 1" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens already filtered from a ?type= link", () => {
    renderAt("/collections/wedding-invitation-suite?type=Royal");
    expect(shownDesigns().sort()).toEqual(["Royal Gold", "Royal Rose"]);
  });

  it("sorts by price", () => {
    renderAt("/collections/wedding-invitation-suite");
    fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "price-low" } });
    expect(shownDesigns()).toEqual(["Floral Bloom", "Royal Rose", "Royal Gold"]);
  });
  it("opens with a compact header: breadcrumb, name, description and count, without a cover photo", () => {
    renderAt("/collections/wedding-invitation-suite");
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    // Invitations is shown under its customer-facing name and links to its category page.
    expect(crumbs).toHaveTextContent("HomeProductsInvitationsWedding Invitation Suite");
    expect(within(crumbs).getByRole("link", { name: "Invitations" })).toHaveAttribute("href", "/products?category=Invitations");
    expect(screen.getByText("Every wedding card design.")).toBeInTheDocument();
    expect(document.querySelector(".collection-meta")).toHaveTextContent("3 designs · from ₹75");
    expect(document.querySelector("img[src*=\"cover.jpg\"]")).toBeNull();
  });

  it("keeps the type chips and a small sort control in one slim row", () => {
    renderAt("/collections/wedding-invitation-suite");
    const bar = document.querySelector(".listing-bar");
    expect(bar).toContainElement(screen.getByRole("group", { name: "Design types" }));
    expect(bar).toContainElement(screen.getByLabelText("Sort by"));
    expect(document.querySelector(".catalog-toolbar")).toBeNull();
    expect(document.querySelector(".results-summary")).toBeNull();
  });

});
