import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import Seo from "../components/Seo.jsx";

// React 19 hoists <title>/<meta>/<link> rendered in a component into <head>.
describe("Seo", () => {
  it("sets a page-specific title, description, and self-referencing canonical", () => {
    render(<Seo title="Widgets" description="Buy widgets" path="/products/widget-1" />);

    expect(document.title).toBe("Widgets | Elite Impressions");

    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toBe("https://eliteimpressions.co.in/products/widget-1");

    const desc = document.head.querySelector('meta[name="description"]');
    expect(desc?.getAttribute("content")).toBe("Buy widgets");
  });

  it("falls back to the brand title when none is given", () => {
    render(<Seo path="/" />);
    expect(document.title).toBe("Elite Impressions | Premium Print Shop");
  });

  it("emits JSON-LD structured data when provided", () => {
    // JSON-LD can live anywhere in the document (Google reads it in body too);
    // React renders this inline rather than hoisting it to <head>.
    render(<Seo path="/" jsonLd={{ "@type": "Store", name: "Elite Impressions" }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(script.textContent).toContain("Elite Impressions");
  });
});
