import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import ResponsiveImage from "../components/ResponsiveImage.jsx";
import fallbackImage from "../assets/images/fallback-image.svg";

describe("ResponsiveImage", () => {
  it("shows a skeleton until the image loads, then reveals it", () => {
    render(<ResponsiveImage src="https://example.com/a.jpg" alt="Test product" />);
    const img = screen.getByAltText("Test product");

    expect(img.className).not.toContain("is-loaded");
    expect(document.querySelector(".image-skeleton")).toBeInTheDocument();

    fireEvent.load(img);

    expect(img.className).toContain("is-loaded");
    expect(document.querySelector(".image-skeleton")).not.toBeInTheDocument();
  });

  it("shows the fallback immediately when src is missing, instead of an unresolvable skeleton", () => {
    render(<ResponsiveImage src="" alt="Test product" />);
    const img = screen.getByAltText("Test product");

    // No src means no request is ever made, so onLoad/onError would never
    // fire on their own — the component must resolve to the fallback
    // synchronously rather than waiting forever.
    expect(img.src).toBe(fallbackImage);
    expect(img.className).toContain("is-loaded");
  });

  it("passes loading/decoding/fetchPriority based on the priority prop", () => {
    const { rerender } = render(<ResponsiveImage src="https://example.com/a.jpg" alt="Test product" />);
    let img = screen.getByAltText("Test product");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("fetchpriority")).toBe("auto");

    rerender(<ResponsiveImage src="https://example.com/a.jpg" alt="Test product" priority />);
    img = screen.getByAltText("Test product");
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("fetchpriority")).toBe("high");
  });

  describe("retry-then-fallback on error", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("retries a failed load twice before giving up and showing the fallback", () => {
      render(<ResponsiveImage src="https://example.com/broken.jpg" alt="Test product" />);
      const img = screen.getByAltText("Test product");
      const originalSrc = img.src;

      act(() => {
        fireEvent.error(img);
        vi.advanceTimersByTime(1000);
      });
      expect(img.src).not.toBe(originalSrc);
      expect(img.src).toContain("retry=1");
      expect(img.src).not.toContain("fallback-image");

      act(() => {
        fireEvent.error(img);
        vi.advanceTimersByTime(2000);
      });
      expect(img.src).toContain("retry=2");
      expect(img.src).not.toContain("fallback-image");

      // Third failure exhausts MAX_RETRIES — falls back synchronously, no
      // further timer needed.
      act(() => {
        fireEvent.error(img);
      });
      expect(img.src).toBe(fallbackImage);
    });

    it("stops instead of looping if the fallback image itself fails to load", () => {
      render(<ResponsiveImage src="" alt="Test product" />);
      const img = screen.getByAltText("Test product");
      expect(img.src).toBe(fallbackImage);

      // Should not throw or hang even if the fallback errors too.
      act(() => {
        fireEvent.error(img);
      });
      expect(img.className).toContain("is-loaded");
    });
  });

  describe("images that finish before React attaches onLoad", () => {
    // jsdom never really loads anything, so `complete` is false and
    // `naturalWidth` is 0 by default. A cached or eager image in a real
    // browser arrives the other way round — already complete by the time the
    // listener exists — so it has to be simulated here.
    const simulateAlreadyCached = () => {
      Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
        configurable: true,
        get: () => true,
      });
      Object.defineProperty(window.HTMLImageElement.prototype, "naturalWidth", {
        configurable: true,
        get: () => 1800,
      });
    };

    afterEach(() => {
      delete window.HTMLImageElement.prototype.complete;
      delete window.HTMLImageElement.prototype.naturalWidth;
    });

    it("reveals an image that was already complete, without waiting for onLoad", () => {
      // The homepage hero bug: eager + cached meant onLoad never fired, so the
      // fade-in never started and a fully downloaded image sat at opacity 0
      // forever. No load event is dispatched in this test on purpose.
      simulateAlreadyCached();

      render(<ResponsiveImage src="https://example.com/hero.jpg" alt="Hero" priority />);

      expect(screen.getByAltText("Hero").className).toContain("is-loaded");
      expect(document.querySelector(".image-skeleton")).not.toBeInTheDocument();
    });

    it("applies to lazy images too, not just priority ones", () => {
      simulateAlreadyCached();

      render(<ResponsiveImage src="https://example.com/card.jpg" alt="Card" />);

      expect(screen.getByAltText("Card").className).toContain("is-loaded");
    });

    it("re-checks after a src swap, where the same race can recur", () => {
      simulateAlreadyCached();

      const { rerender } = render(<ResponsiveImage src="https://example.com/a.jpg" alt="Swap" />);
      expect(screen.getByAltText("Swap").className).toContain("is-loaded");

      rerender(<ResponsiveImage src="https://example.com/b.jpg" alt="Swap" />);
      // The new src is cached too, so it must resolve without a load event
      // rather than being stranded mid-fade.
      expect(screen.getByAltText("Swap").className).toContain("is-loaded");
    });

    it("does not claim a broken image is loaded", () => {
      // complete is true for a FAILED load as well — naturalWidth is what
      // separates "arrived" from "gave up", and treating the two alike would
      // reveal a broken image instead of falling back.
      Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
        configurable: true,
        get: () => true,
      });
      Object.defineProperty(window.HTMLImageElement.prototype, "naturalWidth", {
        configurable: true,
        get: () => 0,
      });

      render(<ResponsiveImage src="https://example.com/broken.jpg" alt="Broken" />);

      expect(screen.getByAltText("Broken").className).not.toContain("is-loaded");
    });
  });

  it("resets to a fresh loading state when the src prop changes", () => {
    const { rerender } = render(<ResponsiveImage src="https://example.com/a.jpg" alt="Test product" />);
    fireEvent.load(screen.getByAltText("Test product"));
    expect(screen.getByAltText("Test product").className).toContain("is-loaded");

    rerender(<ResponsiveImage src="https://example.com/b.jpg" alt="Test product" />);
    expect(screen.getByAltText("Test product").className).not.toContain("is-loaded");
  });
});
