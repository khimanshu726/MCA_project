import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import InstitutionsPage from "../pages/InstitutionsPage.jsx";

const mockUseProducts = vi.fn();
vi.mock("../hooks/useProducts", () => ({ useProducts: (f) => mockUseProducts(f) }));
const mockCreateEnquiry = vi.fn();
vi.mock("../api/enquiriesApi", () => ({ createEnquiry: (p) => mockCreateEnquiry(p) }));
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

describe("InstitutionsPage — bulk quote form", () => {
  const fill = () => {
    fireEvent.change(screen.getByLabelText(/institution name/i), { target: { value: "St. Xavier's College" } });
    fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: "A. Fernandes" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "buyer@stx.edu" } });
    fireEvent.change(screen.getByLabelText(/what do you need/i), { target: { value: "5000 answer booklets" } });
  };

  it("submits the enquiry and shows a confirmation on success", async () => {
    mockUseProducts.mockReturnValue(success([]));
    mockCreateEnquiry.mockResolvedValue({ id: "e1" });
    renderPage();

    fill();
    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    await waitFor(() => expect(mockCreateEnquiry).toHaveBeenCalledTimes(1));
    expect(mockCreateEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({ institutionName: "St. Xavier's College", email: "buyer@stx.edu", requirements: "5000 answer booklets" }),
    );
    expect(await screen.findByText(/request received/i)).toBeInTheDocument();
  });

  it("validates client-side and does not call the API when required fields are missing", () => {
    mockUseProducts.mockReturnValue(success([]));
    mockCreateEnquiry.mockClear();
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    expect(mockCreateEnquiry).not.toHaveBeenCalled();
    expect(screen.getByText(/institution name is required/i)).toBeInTheDocument();
  });
});

describe("InstitutionsPage — product-aware quote items", () => {
  const withOptions = [
    {
      id: "answer-booklet",
      name: "Answer Booklet",
      minimumOrderQty: 500,
      options: [
        { label: "Paper type", values: ["70 gsm", "80 gsm"] },
        { label: "Size", values: ["A4", "Legal"] },
      ],
    },
  ];

  it("renders a product's options as selectors when an item is added, and submits the structured item", async () => {
    mockUseProducts.mockReturnValue(success(withOptions));
    mockCreateEnquiry.mockClear();
    mockCreateEnquiry.mockResolvedValue({ id: "e2" });
    renderPage();

    // Required text fields.
    fireEvent.change(screen.getByLabelText(/institution name/i), { target: { value: "St. Xavier's College" } });
    fireEvent.change(screen.getByLabelText(/contact name/i), { target: { value: "A. Fernandes" } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: "buyer@stx.edu" } });
    fireEvent.change(screen.getByLabelText(/what do you need/i), { target: { value: "Answer booklets" } });

    // Add a structured item and pick the product.
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    fireEvent.change(screen.getByLabelText(/item 1 product/i), { target: { value: "answer-booklet" } });

    // The product's admin-defined options now render as selects.
    const paper = screen.getByLabelText(/item 1 paper type/i);
    const size = screen.getByLabelText(/item 1 size/i);
    expect(paper).toBeInTheDocument();
    expect(size).toBeInTheDocument();

    fireEvent.change(paper, { target: { value: "80 gsm" } });
    fireEvent.change(size, { target: { value: "A4" } });
    fireEvent.change(screen.getByLabelText(/item 1 quantity/i), { target: { value: "5000" } });

    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    await waitFor(() => expect(mockCreateEnquiry).toHaveBeenCalledTimes(1));
    const payload = mockCreateEnquiry.mock.calls[0][0];
    expect(payload.items).toEqual([
      {
        productId: "answer-booklet",
        productName: "Answer Booklet",
        options: [
          { label: "Paper type", value: "80 gsm" },
          { label: "Size", value: "A4" },
        ],
        quantity: 5000,
      },
    ]);
  });
});
