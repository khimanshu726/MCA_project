import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ScrollToTop from "../components/ScrollToTop.jsx";

const mockNavigationType = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigationType: () => mockNavigationType() };
});

const renderAt = (initialEntries, { navigationType = "PUSH" } = {}) => {
  mockNavigationType.mockReturnValue(navigationType);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ScrollToTop />
    </MemoryRouter>,
  );
};

describe("ScrollToTop", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not scroll on first paint", () => {
    // There is nothing to scroll away from on initial load, and animating
    // would be visible jitter on every cold entry to the site.
    renderAt(["/products"]);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls to the top when navigating to a new route", () => {
    // The reported bug: following a footer link from the bottom of a long page
    // left the new page scrolled to the bottom, so it looked like nothing
    // happened. Driven through a real in-router navigation — remounting a new
    // MemoryRouter would look like a first paint and prove nothing.
    mockNavigationType.mockReturnValue("PUSH");

    const Harness = () => {
      const navigate = useNavigate();
      return (
        <>
          <ScrollToTop />
          <button type="button" onClick={() => navigate("/products")}>
            go
          </button>
        </>
      );
    };

    const { getByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Harness />
      </MemoryRouter>,
    );

    expect(window.scrollTo).not.toHaveBeenCalled();

    act(() => getByText("go").click());

    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, behavior: "instant" }),
    );
  });

  it("jumps instantly rather than animating across the whole page", () => {
    // Measured on the real app: a smooth scroll from the home page footer to
    // the top took about four seconds, because the distance is ~5000px. The
    // customer spends that time watching the page they just left slide past.
    // The behaviour must be "instant" — not "auto": "auto" defers to the
    // global `html { scroll-behavior: smooth }` and reintroduces the exact
    // animation this guards against. Only "instant" forces the immediate jump.
    mockNavigationType.mockReturnValue("PUSH");

    const Harness = () => {
      const navigate = useNavigate();
      return (
        <>
          <ScrollToTop />
          <button type="button" onClick={() => navigate("/cart")}>
            go
          </button>
        </>
      );
    };

    const { getByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Harness />
      </MemoryRouter>,
    );

    act(() => getByText("go").click());

    const [options] = window.scrollTo.mock.calls.at(-1);
    expect(options.behavior).toBe("instant");
    expect(options.behavior).not.toBe("smooth");
    expect(options.behavior).not.toBe("auto");
  });

  it("leaves scrolling alone for back/forward navigation", () => {
    // POP means the customer is returning to something they already read.
    // Yanking them to the top loses their place in a long catalog, which is
    // the opposite of helpful.
    renderAt(["/products"], { navigationType: "POP" });
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("hands scroll restoration back to the browser where supported", () => {
    // jsdom's history has no scrollRestoration, so the feature guard skips it
    // entirely by default — which is the correct behaviour, and also means the
    // property has to be provided here to exercise the branch that sets it.
    Object.defineProperty(window.history, "scrollRestoration", {
      configurable: true,
      writable: true,
      value: "manual",
    });

    renderAt(["/"]);

    expect(window.history.scrollRestoration).toBe("auto");
    delete window.history.scrollRestoration;
  });

  it("does not throw in a browser without scrollRestoration", () => {
    expect("scrollRestoration" in window.history).toBe(false);
    expect(() => renderAt(["/"])).not.toThrow();
  });

  it("renders nothing", () => {
    const { container } = renderAt(["/"]);
    expect(container).toBeEmptyDOMElement();
  });
});
