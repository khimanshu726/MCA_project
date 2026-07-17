import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import AccountPage from "../pages/AccountPage.jsx";

/**
 * The account hub. Addresses and the wishlist were both already server-backed
 * and per-customer, and neither was reachable from here — the wishlist route
 * existed but nothing linked to it, and there was no address page at all. So a
 * signed-in customer had no way to see what their account actually held.
 */
const mockUseUserAuth = vi.fn();
const mockUseOrders = vi.fn();
const mockUseAddresses = vi.fn();
const mockUseWishlist = vi.fn();

vi.mock("../context/UserAuthContext", () => ({ useUserAuth: () => mockUseUserAuth() }));
vi.mock("../hooks/useOrders", () => ({ useOrders: () => mockUseOrders() }));
vi.mock("../hooks/useAddresses", () => ({ useAddresses: () => mockUseAddresses() }));
vi.mock("../hooks/useWishlist", () => ({ useWishlist: () => mockUseWishlist() }));
vi.mock("../components/EmailVerificationBanner", () => ({ default: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccountPage />
    </MemoryRouter>,
  );

describe("AccountPage", () => {
  beforeEach(() => {
    mockUseUserAuth.mockReturnValue({
      authUser: null,
      refreshProfile: vi.fn(),
      signOut: vi.fn(),
      user: { email: "buyer@example.com", provider: "email" },
    });
    mockUseOrders.mockReturnValue({ orders: [] });
    mockUseAddresses.mockReturnValue({ addresses: [] });
    mockUseWishlist.mockReturnValue({ items: [] });
  });

  it("links to the saved address book", () => {
    renderPage();

    expect(screen.getByText("Saved Addresses").closest("a")).toHaveAttribute("href", "/account/addresses");
  });

  it("links to the wishlist", () => {
    renderPage();

    expect(screen.getByText("Wishlist").closest("a")).toHaveAttribute("href", "/wishlist");
  });

  it("shows what the account actually holds, so it's visible without clicking through", () => {
    mockUseOrders.mockReturnValue({ orders: [{ id: "o1" }, { id: "o2" }] });
    mockUseAddresses.mockReturnValue({ addresses: [{ _id: "a1" }, { _id: "a2" }, { _id: "a3" }] });
    mockUseWishlist.mockReturnValue({ items: [{ productId: "p1" }] });

    renderPage();

    expect(screen.getByText("Total orders").closest(".summary-line")).toHaveTextContent("2");
    expect(screen.getByText("Saved addresses").closest(".summary-line")).toHaveTextContent("3");
    expect(screen.getByText("Saved items").closest(".summary-line")).toHaveTextContent("1");
  });

  it("shows zero counts rather than hiding an empty section", () => {
    renderPage();

    expect(screen.getByText("Saved addresses").closest(".summary-line")).toHaveTextContent("0");
    expect(screen.getByText("Saved items").closest(".summary-line")).toHaveTextContent("0");
  });
});
