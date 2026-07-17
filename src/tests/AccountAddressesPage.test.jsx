import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccountAddressesPage from "../pages/AccountAddressesPage.jsx";
import * as addressApi from "../api/addressApi.js";

/**
 * The saved address book outside checkout. The distinction that matters: in
 * checkout an address is picked ("deliver here"); here it is managed, so there
 * is no radio and the meaningful action is which one is the default.
 */
vi.mock("../api/addressApi.js");

const mockUseUserAuth = vi.fn();
vi.mock("../context/UserAuthContext", () => ({
  useUserAuth: () => mockUseUserAuth(),
}));

const address = (overrides = {}) => ({
  _id: "addr-1",
  fullName: "Test Buyer",
  phoneNumber: "9876543210",
  addressLine1: "123 Test St",
  addressLine2: "",
  landmark: "",
  city: "Mumbai",
  district: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  addressType: "home",
  isDefault: false,
  ...overrides,
});

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AccountAddressesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AccountAddressesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserAuth.mockReturnValue({
      isAuthenticated: true,
      token: "token",
      user: { email: "buyer@example.com" },
    });
    addressApi.getAddresses.mockResolvedValue({ addresses: [] });
    addressApi.setDefaultAddress.mockResolvedValue({});
    addressApi.deleteAddress.mockResolvedValue({});
  });

  it("lists the customer's saved addresses", async () => {
    addressApi.getAddresses.mockResolvedValue({
      addresses: [address(), address({ _id: "addr-2", fullName: "Office Buyer" })],
    });

    renderPage();

    expect(await screen.findByText("Test Buyer")).toBeInTheDocument();
    expect(screen.getByText("Office Buyer")).toBeInTheDocument();
  });

  it("offers no delivery radio — nothing is being delivered here", async () => {
    addressApi.getAddresses.mockResolvedValue({ addresses: [address()] });

    renderPage();
    await screen.findByText("Test Buyer");

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("can promote an address to default", async () => {
    addressApi.getAddresses.mockResolvedValue({ addresses: [address()] });

    renderPage();
    fireEvent.click(await screen.findByText("Set as default"));

    await waitFor(() => expect(addressApi.setDefaultAddress).toHaveBeenCalledWith("token", "addr-1"));
  });

  it("does not offer to re-default the address that already is one", async () => {
    addressApi.getAddresses.mockResolvedValue({ addresses: [address({ isDefault: true })] });

    renderPage();
    await screen.findByText("Test Buyer");

    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.queryByText("Set as default")).not.toBeInTheDocument();
  });

  it("confirms before deleting, and deletes on confirm", async () => {
    addressApi.getAddresses.mockResolvedValue({ addresses: [address()] });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();
    fireEvent.click(await screen.findByText("Delete"));

    await waitFor(() => expect(addressApi.deleteAddress).toHaveBeenCalledWith("token", "addr-1"));
  });

  it("does not delete when the confirmation is declined", async () => {
    addressApi.getAddresses.mockResolvedValue({ addresses: [address()] });
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();
    fireEvent.click(await screen.findByText("Delete"));

    await waitFor(() => expect(addressApi.deleteAddress).not.toHaveBeenCalled());
  });

  it("says the address book is empty without pointing at a form that isn't shown", async () => {
    renderPage();

    // The checkout copy says "add your first address below", where the form is
    // always rendered underneath. Here it's behind a button.
    expect(await screen.findByText(/No saved addresses yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add new address/i })).toBeInTheDocument();
  });
});
