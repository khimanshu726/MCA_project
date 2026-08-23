import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WhatWePrintSection from "../components/home/WhatWePrintSection.jsx";
import HomeFaqSection from "../components/home/HomeFaqSection.jsx";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("WhatWePrintSection", () => {
  it("lists real categories with descriptive internal links", () => {
    wrap(<WhatWePrintSection />);

    expect(screen.getByRole("link", { name: /business & visiting cards/i })).toHaveAttribute(
      "href",
      "/products?category=Visiting%20Cards",
    );
    expect(screen.getByRole("link", { name: /institutional supplies/i })).toHaveAttribute("href", "/institutions");
    // No invented product types that don't exist in the catalog.
    expect(screen.queryByText(/photo frames|calendars|wall art/i)).not.toBeInTheDocument();
  });
});

describe("HomeFaqSection", () => {
  it("renders factual FAQ questions and emits FAQPage structured data", () => {
    const { container } = wrap(<HomeFaqSection />);

    expect(screen.getByText(/can i upload my own design or photo/i)).toBeInTheDocument();
    expect(screen.getByText(/how do i place an order/i)).toBeInTheDocument();

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script.textContent);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity.length).toBeGreaterThan(3);
    expect(data.mainEntity[0]).toHaveProperty("acceptedAnswer");
  });
});
