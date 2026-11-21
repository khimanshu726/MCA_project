import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProductDetailPage from "../pages/ProductDetailPage";
import MobileBuyBar from "../components/MobileBuyBar";

const card = {
  id: "classic-card",
  name: "Classic Visiting Card",
  description: "350 gsm",
  category: "Visiting Cards",
  images: ["card.jpg"],
  price: 18,
  mrp: 18,
  stock: 1000,
  minimumOrderQty: 100,
  status: "active",
  priceTiers: [{ minQty: 250, price: 16 }],
};

vi.mock("../hooks/useProduct", () => ({ useProduct: () => ({ data: card, isLoading: false, isError: false }) }));
vi.mock("../hooks/useProducts", () => ({ useProducts: () => ({ data: { items: [] } }) }));
vi.mock("../hooks/useRecentlyViewed", () => ({ useRecentlyViewed: () => ({ recordView: vi.fn() }) }));
vi.mock("../hooks/useCart", () => ({ useCart: () => ({ addToCart: vi.fn(), cartItemIds: new Set() }) }));
vi.mock("../components/Seo", () => ({ default: () => null, SITE_URL: "https://example.test" }));
vi.mock("../components/BuyNowButton", () => ({ default: () => <button type="button">Buy Now</button> }));
vi.mock("../components/ui/WishlistButton", () => ({ default: () => null }));
vi.mock("../components/cart/ProductRail", () => ({ default: () => null }));

// Capture the IntersectionObserver the page uses for the sticky bar, so the
// test can say whether the buy buttons are on screen.
let observerCallback = null;
class FakeIntersectionObserver {
  constructor(callback) {
    observerCallback = callback;
  }
  observe() {}
  disconnect() {}
}

afterEach(() => {
  delete window.IntersectionObserver;
  observerCallback = null;
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/products/classic-card"]}>
      <Routes>
        <Route path="/products/:productId" element={<ProductDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("product page on phones", () => {
  it("adds a name-and-price summary before the gallery, keeping a single <h1>", () => {
    const { container } = renderPage();

    const summary = container.querySelector(".detail-mobile-summary");
    const gallery = container.querySelector(".gallery-panel");
    expect(summary).not.toBeNull();
    // The summary comes first in the document, so it's above the gallery.
    expect(summary.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(summary).toHaveAttribute("aria-hidden", "true");
    expect(summary.textContent).toContain("Classic Visiting Card");
    expect(summary.textContent).toContain("₹18");

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Classic Visiting Card");
  });

  it("shows the sticky buy bar only while the page's own buy buttons are off screen", () => {
    window.IntersectionObserver = FakeIntersectionObserver;
    renderPage();

    const bar = screen.getByTestId("mobile-buy-bar");
    expect(bar).toHaveClass("is-visible");

    act(() => observerCallback([{ isIntersecting: true }]));
    expect(bar).not.toHaveClass("is-visible");

    act(() => observerCallback([{ isIntersecting: false }]));
    expect(bar).toHaveClass("is-visible");
  });
});

describe("MobileBuyBar", () => {
  const renderBar = (props) =>
    render(<MobileBuyBar product={card} quantity={250} unitPrice={16} isVisible {...props} />);

  it("shows the line total for the chosen quantity at the tier price", () => {
    renderBar();
    expect(screen.getByText("250 × ₹16")).toBeInTheDocument();
    expect(screen.getByText("₹4,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add .*to cart/i })).toBeInTheDocument();
  });

  it("is hidden from screen readers and keyboard while off screen", () => {
    renderBar({ isVisible: false });
    const bar = screen.getByTestId("mobile-buy-bar");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveAttribute("inert");
  });
});
