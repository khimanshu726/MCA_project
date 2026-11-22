import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { rowKeyHandler, useStackedReveal } from "../../admin-app/src/lib/useStackedReveal";

// A list-and-panel page in miniature, wired the way the admin pages are.
function Harness({ onOpen }) {
  const { panelRef, listRef, revealPanel, revealList } = useStackedReveal();
  const open = () => {
    onOpen();
    revealPanel();
  };
  return (
    <div>
      <table ref={listRef} tabIndex={-1} data-testid="list">
        <tbody>
          <tr tabIndex={0} data-testid="row" onClick={open} onKeyDown={rowKeyHandler(open)}>
            <td>Order 1</td>
          </tr>
        </tbody>
      </table>
      <aside ref={panelRef} tabIndex={-1} data-testid="panel">
        <button type="button" onClick={revealList}>
          Back to list
        </button>
      </aside>
    </div>
  );
}

const setStacked = (isStacked) => {
  window.matchMedia = vi.fn((query) => ({
    matches: query === "(max-width: 1080px)" ? isStacked : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const spyScroll = () => {
  const scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function scrollIntoView(options) {
    scrolled.push({ element: this, options });
  });
  return scrolled;
};

const originalMatchMedia = window.matchMedia;
const originalScroll = Element.prototype.scrollIntoView;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  Element.prototype.scrollIntoView = originalScroll;
});

describe("admin list/panel on stacked (phone and tablet) layouts", () => {
  it("scrolls the panel into view and moves focus to it when a row is picked", () => {
    setStacked(true);
    const scrolled = spyScroll();
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("row"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].element).toBe(screen.getByTestId("panel"));
    expect(scrolled[0].options).toMatchObject({ block: "start" });
    expect(document.activeElement).toBe(screen.getByTestId("panel"));
  });

  it("takes the admin back to the list from the panel", () => {
    setStacked(true);
    const scrolled = spyScroll();
    render(<Harness onOpen={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Back to list" }));

    expect(scrolled[0].element).toBe(screen.getByTestId("list"));
    expect(document.activeElement).toBe(screen.getByTestId("list"));
  });

  it("does not scroll on desktop, where the panel is already beside the list", () => {
    setStacked(false);
    const scrolled = spyScroll();
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("row"));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveLength(0);
  });

  it("opens a row with Enter or Space, and ignores other keys", () => {
    setStacked(false);
    spyScroll();
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    const row = screen.getByTestId("row");

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "a" });

    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
