import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../components/Seo", () => ({ default: () => null }));

import SiteFooter from "../components/SiteFooter";
import WhatsAppButton, { whatsappMessageFor } from "../components/WhatsAppButton";
import AboutPage from "../pages/info/AboutPage";
import ContactPage from "../pages/info/ContactPage";
import FaqPage from "../pages/info/FaqPage";
import PrivacyPage from "../pages/info/PrivacyPage";
import TermsPage from "../pages/info/TermsPage";
import { BUSINESS, whatsappUrl } from "../config/business";

const renderAt = (ui, url = "/") => render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

describe("footer links", () => {
  it("sends every Company and Services link to a real page, not the home page", () => {
    renderAt(<SiteFooter />);
    const hrefOf = (name) => screen.getByRole("link", { name }).getAttribute("href");

    expect(hrefOf("About")).toBe("/about");
    expect(hrefOf("Contact")).toBe("/contact");
    expect(hrefOf("FAQ")).toBe("/faq");
    expect(hrefOf("Privacy")).toBe("/privacy");
    expect(hrefOf("Terms")).toBe("/terms");
    expect(hrefOf("Bulk Orders")).toBe("/contact#bulk");
    expect(hrefOf("Rush Print")).toBe("/contact#rush");
    expect(hrefOf("Privacy policy")).toBe("/privacy");
    expect(hrefOf("Terms of service")).toBe("/terms");
  });

  it("offers WhatsApp beside the phone and email", () => {
    renderAt(<SiteFooter />);
    const link = screen.getByRole("link", { name: "WhatsApp us" });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/919288675153\?text=/);
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("WhatsApp", () => {
  it("builds a chat link with the message typed in", () => {
    expect(whatsappUrl("Hi, 500 cards & invites?")).toBe(
      `https://wa.me/${BUSINESS.whatsapp}?text=Hi%2C%20500%20cards%20%26%20invites%3F`,
    );
    expect(whatsappUrl()).toBe(`https://wa.me/${BUSINESS.whatsapp}`);
  });

  it("names the product page the customer is on", () => {
    expect(whatsappMessageFor("/products/wall-art", "https://x/products/wall-art")).toContain(
      "https://x/products/wall-art",
    );
    expect(whatsappMessageFor("/", "https://x/")).not.toContain("https://x/");
  });

  it("floats on shop pages but stays out of checkout", () => {
    const { unmount } = renderAt(<WhatsAppButton />, "/products");
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", expect.stringContaining("wa.me"));
    unmount();

    renderAt(<WhatsAppButton />, "/checkout/review");
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
  });
});

describe("information pages", () => {
  it.each([
    ["About", <AboutPage key="a" />, "About Elite Impressions"],
    ["Contact", <ContactPage key="c" />, "Contact us"],
    ["FAQ", <FaqPage key="f" />, "Frequently asked questions"],
    ["Privacy", <PrivacyPage key="p" />, "Privacy policy"],
    ["Terms", <TermsPage key="t" />, "Terms of service"],
  ])("%s page has its own heading", (_name, page, heading) => {
    renderAt(page);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
  });

  it("has bulk and rush sections on the contact page, each with a WhatsApp message ready", () => {
    renderAt(<ContactPage />);
    expect(document.getElementById("bulk")).toHaveTextContent("Bulk orders");
    expect(document.getElementById("rush")).toHaveTextContent("Rush printing");
    expect(screen.getByRole("link", { name: /Ask for a bulk quote/ }).getAttribute("href")).toContain("bulk%20order");
    expect(screen.getByRole("link", { name: /Ask about a rush order/ }).getAttribute("href")).toContain("rush");
    const cards = document.querySelector(".contact-cards");
    expect(within(cards).getByRole("link", { name: /Call/ })).toHaveAttribute("href", `tel:${BUSINESS.phone}`);
  });

  it("lists the FAQ answers on the FAQ page", () => {
    renderAt(<FaqPage />);
    expect(screen.getByText("Do you ship or deliver?")).toBeInTheDocument();
  });
});
