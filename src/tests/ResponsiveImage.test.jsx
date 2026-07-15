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

  it("resets to a fresh loading state when the src prop changes", () => {
    const { rerender } = render(<ResponsiveImage src="https://example.com/a.jpg" alt="Test product" />);
    fireEvent.load(screen.getByAltText("Test product"));
    expect(screen.getByAltText("Test product").className).toContain("is-loaded");

    rerender(<ResponsiveImage src="https://example.com/b.jpg" alt="Test product" />);
    expect(screen.getByAltText("Test product").className).not.toContain("is-loaded");
  });
});
