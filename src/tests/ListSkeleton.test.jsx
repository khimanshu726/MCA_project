import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import ListSkeleton from "../components/ui/ListSkeleton.jsx";

describe("ListSkeleton", () => {
  it("renders the requested number of placeholder rows, hidden from assistive tech", () => {
    const { container } = render(<ListSkeleton count={4} />);
    const wrapper = container.firstChild;
    expect(wrapper.getAttribute("aria-hidden")).toBe("true");
    expect(wrapper.children.length).toBe(4);
  });

  it("applies the row height class and disables animation for reduced motion", () => {
    const { container } = render(<ListSkeleton count={1} rowClassName="h-[76px]" />);
    const row = container.firstChild.firstChild;
    expect(row.className).toContain("h-[76px]");
    expect(row.className).toContain("motion-reduce:animate-none");
  });
});
