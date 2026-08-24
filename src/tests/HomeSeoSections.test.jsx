import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomeFaqSection from "../components/home/HomeFaqSection.jsx";

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

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
