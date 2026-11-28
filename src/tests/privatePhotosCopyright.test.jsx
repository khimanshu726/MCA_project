import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchCustomerPhotoLink = vi.fn();
vi.mock("../../admin-app/src/lib/adminApi", () => ({
  API_ASSET_BASE_URL: "http://api.test",
  fetchCustomerPhotoLink: (...args) => fetchCustomerPhotoLink(...args),
}));
vi.mock("../components/Seo", () => ({ default: () => null }));

import OrderLinePhoto from "../../admin-app/src/components/OrderLinePhoto";
import SiteFooter from "../components/SiteFooter";
import TermsPage from "../pages/info/TermsPage";
import PrivacyPage from "../pages/info/PrivacyPage";

afterEach(() => fetchCustomerPhotoLink.mockReset());

describe("a customer photo on an admin order", () => {
  it("asks for a time-limited link and shows the photo with it", async () => {
    fetchCustomerPhotoLink.mockResolvedValue({ url: "/api/customer-photos/ph1/view?expires=1&sig=abc" });
    render(<OrderLinePhoto photo={{ id: "ph1" }} productName="Wall Art" token="admin-token" />);

    const img = await screen.findByAltText("Customer photo for Wall Art");
    expect(img).toHaveAttribute("src", "http://api.test/api/customer-photos/ph1/view?expires=1&sig=abc");
    expect(screen.getByRole("link", { name: /Open customer photo/ })).toHaveAttribute("target", "_blank");
    expect(fetchCustomerPhotoLink).toHaveBeenCalledWith("ph1", "admin-token");
  });

  it("says so when the link can't be made", async () => {
    fetchCustomerPhotoLink.mockRejectedValue(new Error("Photo not found."));
    render(<OrderLinePhoto photo={{ id: "gone" }} productName="Wall Art" token="t" />);
    expect(await screen.findByText(/Customer photo: Photo not found\./)).toBeInTheDocument();
  });
});

describe("copyright notice", () => {
  it("is in the footer", () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Product photos and designs on this site are ours/)).toBeInTheDocument();
  });

  it("has its own section in the Terms, and the Privacy page says customer photos are private", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );
    const section = document.getElementById("copyright");
    expect(section).toHaveTextContent("Our photos and content");
    expect(section.nextElementSibling).toHaveTextContent(/without our written permission/);
  });

  it("says customer photos are stored privately", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/stored\s+privately/).length).toBeGreaterThan(0);
  });
});
