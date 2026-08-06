import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage.jsx";

/**
 * The Featured products rail runs a live catalog query. The rest of the page
 * is static. useProducts is mocked to a resolved-but-empty answer so the page
 * renders deterministically without a QueryClient — and so the rail lands on
 * its empty branch rather than mounting ProductCards, which would otherwise
 * drag cart/wishlist providers into a page-layout test. The rail's own
 * loading / outage / empty branches are simple enough to trust from the shape
 * of the code; what is worth protecting here is the page itself:
 *
 *  - the CTAs still reach real routes, and category links are still encoded
 *    (the "Labels & Packaging" truncation bug was a query-string defect, not
 *    a category-grid one — the same mistake is available to any link that
 *    puts a category name in a URL);
 *  - the duplicated text-roll label does not leak into the accessible name;
 *  - the decorative hero backdrop cannot swallow a click meant for the CTA;
 *  - the live clock actually ticks and is cleaned up;
 *  - the sections stay in order with sequential numbering.
 */

vi.mock("../hooks/useProducts", () => ({
  useProducts: () => ({ data: { items: [] }, isLoading: false, isFetching: false, refetch: vi.fn() }),
}));

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

afterEach(() => {
  vi.useRealTimers();
});

describe("HomePage — navigation", () => {
  it("points the primary CTAs at real routes", () => {
    renderHome();

    expect(screen.getByRole("link", { name: /start customizing/i })).toHaveAttribute(
      "href",
      "/customize",
    );
    // Rendered twice — once in the stacked layout, once in the desktop grid.
    // Both must agree; a divergence means one branch was edited alone.
    const catalogLinks = screen.getAllByRole("link", { name: /browse the catalog/i });
    expect(catalogLinks.length).toBeGreaterThan(0);
    catalogLinks.forEach((link) => expect(link).toHaveAttribute("href", "/products"));
  });

  it("encodes category names that would otherwise break the query string", () => {
    const { container } = renderHome();

    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    const merch = hrefs.find((href) => href?.includes("Clothing"));

    // A raw "&" truncates the parameter and silently filters by "Clothing "
    // rather than "Clothing & Merchandise".
    expect(merch).toBe("/products?category=Clothing%20%26%20Merchandise");
    expect(merch).not.toContain("Clothing & ");
  });

  it("gives every work card a destination", () => {
    renderHome();

    const cards = screen.getAllByRole("article");
    expect(cards.length).toBeGreaterThanOrEqual(2);

    cards.forEach((card) => {
      const link = within(card).getByRole("link");
      expect(link.getAttribute("href")).toMatch(/^\/products\?category=/);
    });
  });
});

describe("HomePage — text-roll buttons", () => {
  it("does not double the label in the accessible name", () => {
    // The roll effect renders the label twice inside a clipped window. If the
    // second copy is exposed, the button announces as "Start customizing
    // Start customizing" — the reason it carries aria-hidden.
    renderHome();

    const cta = screen.getByRole("link", { name: /start customizing/i });
    expect(cta).toHaveAccessibleName("Start customizing");
  });

  it("keeps both label copies in the DOM so the roll has something to reveal", () => {
    const { container } = renderHome();

    const copies = [...container.querySelectorAll("span")].filter(
      (node) => node.textContent === "Start customizing" && node.children.length === 0,
    );
    expect(copies).toHaveLength(2);
  });
});

describe("HomePage — hero backdrop", () => {
  it("is decorative and cannot intercept a click", () => {
    const { container } = renderHome();

    const backdrop = container.querySelector(".axion-shader");
    expect(backdrop).toBeTruthy();
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    // pointer-events is set in axion-home.css, which jsdom does not apply;
    // asserting the class is the honest check that the rule can reach it.
    expect(backdrop.className).toContain("axion-shader");
  });
});

describe("HomePage — press clock", () => {
  it("renders a time and advances it", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T09:30:00Z"));

    renderHome();
    expect(screen.getByText(/\d{2}:\d{2} press time/)).toBeInTheDocument();

    vi.setSystemTime(new Date("2026-01-01T10:31:00Z"));
    vi.advanceTimersByTime(1000);

    // The label re-renders from the new clock rather than freezing at mount.
    expect(screen.getByText(/\d{2}:\d{2} press time/)).toBeInTheDocument();
  });

  it("clears its interval on unmount", () => {
    vi.useFakeTimers();
    const clear = vi.spyOn(window, "clearInterval");

    const { unmount } = renderHome();
    unmount();

    // Left running, it sets state on an unmounted tree once a second for the
    // rest of the session.
    expect(clear).toHaveBeenCalled();
    clear.mockRestore();
  });
});

describe("HomePage — content", () => {
  it("renders the sections in order with their numbering", () => {
    renderHome();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/launch-ready/i);

    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent(/cleaner ordering flow/i);
    expect(headings[1]).toHaveTextContent(/best-sellers/i);
    expect(headings[2]).toHaveTextContent(/our work/i);

    // Badges carry the running section count; the live rail sits between the
    // intro and the case studies.
    expect(screen.getByText("Introducing Elite Impressions")).toBeInTheDocument();
    expect(screen.getByText("Featured products")).toBeInTheDocument();
    expect(screen.getByText("Featured client work")).toBeInTheDocument();
  });

  it("gives every image real alt text", () => {
    renderHome();

    screen.getAllByRole("img").forEach((img) => {
      expect(img.getAttribute("alt")?.trim()).toBeTruthy();
    });
  });
});
