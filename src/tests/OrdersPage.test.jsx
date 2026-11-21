import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrdersPage, { orderSummary } from "../pages/OrdersPage";

const mockUseOrders = vi.fn();
const mockUseProducts = vi.fn();

vi.mock("../hooks/useOrders", () => ({ useOrders: () => mockUseOrders() }));
vi.mock("../hooks/useProducts", () => ({ useProducts: (filters) => mockUseProducts(filters) }));
// Render a plain <img> so tests can see which product image each thumbnail uses.
vi.mock("../components/ResponsiveImage", () => ({
  default: ({ src }) => <img data-testid="thumb-img" src={src} alt="" />,
}));

const line = (productId, name, quantity) => ({ productId, name, quantity, unitPrice: 1, totalPrice: quantity });

const singleItemOrder = {
  id: "o1",
  orderId: "EE-20260820-B2BB",
  createdAt: "2026-08-20T10:00:00.000Z",
  orderStatus: "Delivered",
  price: 198,
  quantity: 100,
  lineItems: [line("classic-card", "Classic Visiting Card", 100)],
};

const multiItemOrder = {
  id: "o2",
  orderId: "EE-20260722-A4E3",
  createdAt: "2026-07-22T10:00:00.000Z",
  orderStatus: "Cancelled",
  price: 1905,
  quantity: 131,
  lineItems: [
    line("classic-card", "Classic Visiting Card", 100),
    line("photo-mug", "Custom Photo Mug", 6),
    line("logo-tee", "Logo T-Shirt", 10),
    line("launch-flyer", "Launch Flyer Pack", 15),
  ],
};

const legacyOrder = {
  id: "o3",
  orderId: "EE-20260601-OLD1",
  createdAt: "2026-06-01T10:00:00.000Z",
  orderStatus: "Delivered",
  price: 500,
  quantity: 50,
  productName: "Wedding Invitation Suite",
};

const product = (id) => ({ id, name: id, images: [`https://img.test/${id}.jpg`] });

const renderPage = (orders, products = []) => {
  mockUseOrders.mockReturnValue({ orders, isLoading: false });
  mockUseProducts.mockReturnValue({ data: { items: products } });
  return render(
    <MemoryRouter>
      <OrdersPage />
    </MemoryRouter>,
  );
};

const rowFor = (orderId) => screen.getByRole("link", { name: new RegExp(`Order ${orderId}`) });

describe("orderSummary", () => {
  it("names a single-item order with its quantity", () => {
    expect(orderSummary(singleItemOrder).title).toBe("Classic Visiting Card × 100");
  });

  it("names the first item and counts the rest", () => {
    expect(orderSummary(multiItemOrder).title).toBe("Classic Visiting Card × 100 + 3 more");
  });

  it("falls back to productName for orders saved before line items existed", () => {
    expect(orderSummary(legacyOrder).title).toBe("Wedding Invitation Suite × 50");
  });
});

describe("OrdersPage", () => {
  beforeEach(() => {
    mockUseOrders.mockReset();
    mockUseProducts.mockReset();
  });

  it("shows what was ordered, with the order number and date as secondary details", () => {
    renderPage([singleItemOrder], [product("classic-card")]);

    const row = rowFor("EE-20260820-B2BB");
    expect(within(row).getByText("Classic Visiting Card × 100")).toBeInTheDocument();
    expect(within(row).getByText(/EE-20260820-B2BB · 20 Aug 2026/)).toBeInTheDocument();
    expect(within(row).getByText("Delivered")).toBeInTheDocument();
    expect(row).toHaveAttribute("href", "/account/orders/EE-20260820-B2BB");
    // No more "100 items" — that was a unit count, not a number of products.
    expect(within(row).queryByText(/100 items/)).not.toBeInTheDocument();
  });

  it("shows the ordered product's image as the thumbnail", () => {
    renderPage([singleItemOrder], [product("classic-card")]);

    const images = within(rowFor("EE-20260820-B2BB")).getAllByTestId("thumb-img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual(["https://img.test/classic-card.jpg"]);
  });

  it("shows at most three thumbnails and a +N chip for the rest", () => {
    renderPage([multiItemOrder], ["classic-card", "photo-mug", "logo-tee", "launch-flyer"].map(product));

    const row = rowFor("EE-20260722-A4E3");
    expect(within(row).getAllByTestId("order-thumbnail")).toHaveLength(3);
    expect(within(row).getByText("+1")).toBeInTheDocument();
    expect(within(row).getByText("Classic Visiting Card × 100 + 3 more")).toBeInTheDocument();
  });

  it("still names an item whose product is no longer in the catalog, without an image", () => {
    renderPage([singleItemOrder], []);

    const row = rowFor("EE-20260820-B2BB");
    expect(within(row).getByText("Classic Visiting Card × 100")).toBeInTheDocument();
    expect(within(row).queryByTestId("thumb-img")).not.toBeInTheDocument();
    expect(within(row).getAllByTestId("order-thumbnail")).toHaveLength(1);
  });

  it("handles a legacy order without line items", () => {
    renderPage([legacyOrder], []);

    expect(within(rowFor("EE-20260601-OLD1")).getByText("Wedding Invitation Suite × 50")).toBeInTheDocument();
  });

  it("looks up every order's products in one request, without duplicate ids", () => {
    renderPage([singleItemOrder, multiItemOrder, legacyOrder], []);

    const calls = mockUseProducts.mock.calls.map(([filters]) => filters);
    const last = calls[calls.length - 1];
    expect(last.ids).toEqual(["classic-card", "photo-mug", "logo-tee", "launch-flyer"]);
    expect(last.limit).toBe(4);
    expect(new Set(calls.map((filters) => JSON.stringify(filters))).size).toBe(1);
  });
});
