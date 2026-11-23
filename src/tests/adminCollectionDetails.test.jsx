import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../admin-app/src/lib/adminApi", () => ({
  updateCollection: vi.fn(),
  uploadProductImages: vi.fn(),
  fetchAdminProducts: vi.fn(() => Promise.resolve({ items: [] })),
}));

import { updateCollection } from "../../admin-app/src/lib/adminApi";
import CollectionDetailsPanel from "../../admin-app/src/components/CollectionDetailsPanel";

const collection = {
  id: "col-1",
  name: "Classic Visiting Card",
  description: "350 gsm cards",
  coverImage: "https://example.com/card.jpg",
  category: "Visiting Cards",
  status: "active",
};

const renderPanel = () => {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  render(<CollectionDetailsPanel token="tok" collection={collection} onSaved={onSaved} onCancel={onCancel} />);
  return { onSaved, onCancel };
};

describe("editing a collection from the product form", () => {
  beforeEach(() => {
    updateCollection.mockReset();
  });

  it("starts from the collection's current details", () => {
    renderPanel();
    expect(screen.getByLabelText("Collection name")).toHaveValue("Classic Visiting Card");
    expect(screen.getByLabelText("Collection description")).toHaveValue("350 gsm cards");
    expect(screen.getByLabelText("Shown under")).toHaveValue("Visiting Cards");
    expect(screen.getByRole("checkbox")).toBeChecked();
    // The uploader shows the current cover as its one thumbnail.
    expect(document.querySelector(".image-thumb img")).toHaveAttribute("src", expect.stringContaining("card.jpg"));
  });

  it("saves the changes to the collection and hands back the result", async () => {
    const saved = { ...collection, name: "Visiting Cards", status: "draft" };
    updateCollection.mockResolvedValue({ collection: saved });
    const { onSaved } = renderPanel();

    fireEvent.change(screen.getByLabelText("Collection name"), { target: { value: " Visiting Cards " } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Save collection" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(updateCollection).toHaveBeenCalledWith(
      "col-1",
      {
        name: "Visiting Cards",
        description: "350 gsm cards",
        coverImage: "https://example.com/card.jpg",
        category: "Visiting Cards",
        status: "draft",
      },
      "tok",
    );
  });

  it("won't save without a name", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Collection name"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save collection" }));
    expect(screen.getByText("The collection needs a name.")).toBeInTheDocument();
    expect(updateCollection).not.toHaveBeenCalled();
  });

  it("shows the server's error inline", async () => {
    const error = new Error("Please correct the fields.");
    error.payload = { errors: { name: "A collection with this name already exists." } };
    updateCollection.mockRejectedValue(error);
    const { onSaved } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Save collection" }));
    expect(await screen.findByText("A collection with this name already exists.")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
