import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useHideOnScroll } from "../hooks/useLayoutState";
import AppHeader from "../components/AppHeader";

vi.mock("../components/SearchAutocomplete", () => ({ default: () => <div data-testid="search" /> }));
vi.mock("../components/AccountMenu", () => ({ default: () => <div data-testid="account" /> }));

// A browser runs requestAnimationFrame callbacks on the next frame, not
// inside the call. Queue them, and run the queue after each scroll event.
let frameQueue = [];
beforeEach(() => {
  frameQueue = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frameQueue.push(callback);
    return frameQueue.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  window.scrollY = 0;
});

const scrollTo = (y) =>
  act(() => {
    window.scrollY = y;
    window.dispatchEvent(new Event("scroll"));
    const callbacks = frameQueue;
    frameQueue = [];
    callbacks.forEach((callback) => callback());
  });

describe("useHideOnScroll", () => {
  it("hides while scrolling down past the offset and shows again on any scroll up", () => {
    const { result } = renderHook(() => useHideOnScroll({ offset: 160, tolerance: 8 }));
    expect(result.current).toBe(false);

    scrollTo(100);
    expect(result.current).toBe(false); // still near the top

    scrollTo(400);
    expect(result.current).toBe(true);

    scrollTo(380);
    expect(result.current).toBe(false); // scrolled up

    scrollTo(700);
    expect(result.current).toBe(true);

    scrollTo(120);
    expect(result.current).toBe(false); // back near the top
  });

  it("ignores tiny movements so the header doesn't flicker", () => {
    const { result } = renderHook(() => useHideOnScroll({ offset: 160, tolerance: 8 }));
    scrollTo(500);
    expect(result.current).toBe(true);

    scrollTo(496); // 4px up: jitter
    expect(result.current).toBe(true);
  });
});

describe("AppHeader on phones", () => {
  const renderHeader = (props = {}) =>
    render(
      <MemoryRouter>
        <AppHeader
          searchTerm=""
          onSearchTermChange={vi.fn()}
          onSearchSubmit={vi.fn()}
          cartCount={0}
          wishlistCount={0}
          mobileOpen={false}
          onToggleMobile={vi.fn()}
          onCloseMobile={vi.fn()}
          {...props}
        />
      </MemoryRouter>,
    );

  it("marks the header hidden when asked (the CSS slides it away on phones)", () => {
    const { container } = renderHeader({ isHidden: true });
    expect(container.querySelector("header")).toHaveClass("is-hidden");
  });

  it("keeps the header shown by default", () => {
    const { container } = renderHeader();
    expect(container.querySelector("header")).not.toHaveClass("is-hidden");
  });

  it("puts the main links in the menu next to the categories", () => {
    const { container } = renderHeader({ mobileOpen: true });
    const menu = container.querySelector(".header-nav-row.is-open");
    const labels = [...menu.querySelectorAll("a")].map((link) => link.textContent);
    expect(labels).toEqual(expect.arrayContaining(["Home", "Products", "Customize", "Business Cards"]));
  });
});
