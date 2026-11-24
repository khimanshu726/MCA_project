import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FeatureStar from "../../admin-app/src/components/FeatureStar";

const renderInRow = (product) => {
  const onToggle = vi.fn();
  const onRowClick = vi.fn();
  const onRowKey = vi.fn();
  render(
    <table>
      <tbody>
        <tr onClick={onRowClick} onKeyDown={onRowKey}>
          <td>
            <FeatureStar product={product} onToggle={onToggle} />
          </td>
        </tr>
      </tbody>
    </table>,
  );
  return { onToggle, onRowClick, onRowKey };
};

describe("the Featured star in the admin product list", () => {
  it("features a product in one click without opening the editor", () => {
    const product = { id: "p1", name: "Krishna Artwork", featured: false };
    const { onToggle, onRowClick, onRowKey } = renderInRow(product);

    const star = screen.getByRole("button", { name: /show Krishna Artwork first in the shop/ });
    expect(star).toHaveAttribute("aria-pressed", "false");
    fireEvent.keyDown(star, { key: "Enter" });
    fireEvent.click(star);

    expect(onToggle).toHaveBeenCalledWith(product);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(onRowKey).not.toHaveBeenCalled();
  });

  it("shows a filled star for a featured product", () => {
    renderInRow({ id: "p2", name: "Wall Clock", featured: true });
    const star = screen.getByRole("button", { name: /Wall Clock/ });
    expect(star).toHaveAttribute("aria-pressed", "true");
    expect(star).toHaveTextContent("★");
    expect(star).toHaveAttribute("title", "Featured: shown first in the shop");
  });
});
