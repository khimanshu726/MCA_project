import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StudioAppBar from "../customizer/components/studio/StudioAppBar";

const renderBar = (props = {}) =>
  render(
    <StudioAppBar
      projectName="My card"
      onProjectNameChange={vi.fn()}
      onBack={vi.fn()}
      sides={[{ id: "front", label: "Front" }]}
      activeSideId="front"
      onSideChange={vi.fn()}
      canUndo
      canRedo
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      isDirty={false}
      isPersisting={false}
      isExporting={false}
      onPreview={vi.fn()}
      onSave={vi.fn()}
      onAddToCart={vi.fn()}
      onBuyNow={vi.fn()}
      {...props}
    />,
  );

describe("StudioAppBar", () => {
  // On phones the Preview / Add to cart / Save text is hidden and only the
  // icon shows; without an aria-label those buttons announced nothing.
  it("names every button, including the ones that are icon-only on phones", () => {
    renderBar();

    for (const name of ["Back to product", "Undo", "Redo", "Save", "Preview", "Add to cart", "Buy now"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    const unnamed = screen.getAllByRole("button").filter((button) => !button.getAttribute("aria-label") && !button.textContent.trim());
    expect(unnamed).toHaveLength(0);
  });

  it("names the Add to cart button while the design is being prepared", () => {
    renderBar({ isExporting: true });
    expect(screen.getByRole("button", { name: "Preparing your design" })).toBeInTheDocument();
  });

  it("gives the toolbar buttons a 44px size on phones and stops them shrinking", () => {
    renderBar();
    for (const name of ["Undo", "Redo", "Back to product"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toMatch(/max-lg:size-11/);
      expect(button.className).toMatch(/shrink-0/);
    }
    for (const name of ["Save", "Preview", "Add to cart", "Buy now"]) {
      expect(screen.getByRole("button", { name }).className).toMatch(/max-lg:h-11/);
    }
  });
});
