import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuantitySelector from "../components/ui/QuantitySelector.jsx";

const renderSelector = (overrides = {}) => {
  const props = {
    value: 5,
    onChange: vi.fn(),
    min: 1,
    max: 10,
    ariaLabel: "Quantity for Test Product",
    ...overrides,
  };

  render(<QuantitySelector {...props} />);
  return props;
};

describe("QuantitySelector", () => {
  it("increments and decrements via the buttons", () => {
    const props = renderSelector();

    fireEvent.click(screen.getByLabelText("Increase quantity"));
    expect(props.onChange).toHaveBeenCalledWith(6);

    fireEvent.click(screen.getByLabelText("Decrease quantity"));
    expect(props.onChange).toHaveBeenCalledWith(4);
  });

  it("disables the buttons at min/max bounds", () => {
    renderSelector({ value: 1, min: 1, max: 10 });
    expect(screen.getByLabelText("Decrease quantity")).toBeDisabled();

    renderSelector({ value: 10, min: 1, max: 10 });
    expect(screen.getAllByLabelText("Increase quantity")[1]).toBeDisabled();
  });

  it("increments/decrements with ArrowUp/ArrowDown on the input", () => {
    const props = renderSelector();
    const input = screen.getByRole("textbox", { name: "Quantity for Test Product" });

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(props.onChange).toHaveBeenCalledWith(6);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(props.onChange).toHaveBeenCalledWith(4);
  });

  it("shows a pending overlay and disables interaction while isPending", () => {
    renderSelector({ isPending: true });

    expect(screen.getByLabelText("Increase quantity")).toBeDisabled();
    expect(screen.getByLabelText("Decrease quantity")).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Quantity for Test Product" })).toBeDisabled();
  });

  it("blurs the input on wheel so scrolling never changes the value", () => {
    renderSelector();
    const input = screen.getByRole("textbox", { name: "Quantity for Test Product" });
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.wheel(input);
    expect(document.activeElement).not.toBe(input);
  });

  it("clamps manual input to the min/max range on blur", () => {
    const props = renderSelector({ value: 5, min: 2, max: 8 });
    const input = screen.getByRole("textbox", { name: "Quantity for Test Product" });

    fireEvent.change(input, { target: { value: "99" } });
    fireEvent.blur(input);
    expect(props.onChange).toHaveBeenCalledWith(8);
  });
});

describe("QuantitySelector with a step (sold in lots)", () => {
  const lots = { value: 100, min: 100, max: 1000, step: 50 };

  it("moves one lot at a time: 100 → 150, 150 → 100", () => {
    const props = renderSelector(lots);
    fireEvent.click(screen.getByLabelText("Increase quantity"));
    expect(props.onChange).toHaveBeenLastCalledWith(150);
  });

  it("steps down by a lot, and with the arrow keys too", () => {
    const props = renderSelector({ ...lots, value: 250 });
    fireEvent.click(screen.getByLabelText("Decrease quantity"));
    expect(props.onChange).toHaveBeenLastCalledWith(200);
    const input = screen.getByRole("textbox", { name: "Quantity for Test Product" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(props.onChange).toHaveBeenLastCalledWith(300);
  });

  it("snaps a typed amount to the nearest lot", () => {
    const props = renderSelector(lots);
    const input = screen.getByRole("textbox", { name: "Quantity for Test Product" });
    fireEvent.change(input, { target: { value: "180" } });
    fireEvent.blur(input);
    expect(props.onChange).toHaveBeenLastCalledWith(200);
    expect(input).toHaveValue("200");
  });

  it("stops at the last whole lot within stock", () => {
    renderSelector({ ...lots, value: 400, max: 420 });
    expect(screen.getByLabelText("Increase quantity")).toBeDisabled();
  });
});
