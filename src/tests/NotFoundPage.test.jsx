import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import NotFoundPage from "../pages/NotFoundPage";

vi.mock("../components/Seo", () => ({
  // A <span>, not <meta>: React 19 hoists <meta> into <head>, outside the
  // rendered container.
  default: ({ title, noindex }) => <span data-testid="seo" data-title={title} data-noindex={String(noindex)} />,
}));

describe("NotFoundPage", () => {
  it("tells the visitor the page doesn't exist and offers a way back", () => {
    render(
      <MemoryRouter initialEntries={["/this-page-does-not-exist"]}>
        <Routes>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /couldn.t find that page/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Browse all products" })).toHaveAttribute("href", "/products");
    const seo = screen.getByTestId("seo");
    expect(seo).toHaveAttribute("data-title", "Page not found");
    expect(seo).toHaveAttribute("data-noindex", "true");
  });
});
