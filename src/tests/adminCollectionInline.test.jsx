import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../admin-app/src/lib/adminApi", () => ({
  createCollection: vi.fn(),
}));

import { createCollection } from "../../admin-app/src/lib/adminApi";
import NewCollectionPanel from "../../admin-app/src/components/NewCollectionPanel";

const EXISTING = [{ id: "col-1", name: "Wedding Invitation Suite", category: "Invitations", status: "active" }];

const renderPanel = (props = {}) => {
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  render(
    <NewCollectionPanel
      token="tok"
      existingCollections={EXISTING}
      defaultCategory="Wedding Cards"
      defaultCover="https://example.com/red-card.jpg"
      onCreated={onCreated}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onCreated, onCancel };
};

describe("creating a collection from the product form", () => {
  beforeEach(() => {
    createCollection.mockReset();
  });

  it("creates a live collection under the product's category, with its photo as cover, and hands it back", async () => {
    const saved = { id: "col-2", name: "Birthday Cards", category: "Wedding Cards", status: "active" };
    createCollection.mockResolvedValue({ collection: saved });
    const { onCreated } = renderPanel();

    expect(screen.getByLabelText("Shown under")).toHaveValue("Wedding Cards");
    fireEvent.change(screen.getByLabelText("Collection name"), { target: { value: "  Birthday Cards " } });
    fireEvent.click(screen.getByRole("button", { name: "Create collection" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(saved));
    expect(createCollection).toHaveBeenCalledWith(
      {
        name: "Birthday Cards",
        category: "Wedding Cards",
        status: "active",
        coverImage: "https://example.com/red-card.jpg",
      },
      "tok",
    );
  });

  it("saves it as a draft when 'Show it on the shop' is unticked", async () => {
    createCollection.mockResolvedValue({ collection: { id: "col-2" } });
    renderPanel();

    fireEvent.change(screen.getByLabelText("Collection name"), { target: { value: "Birthday Cards" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(/customers won't see it/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create collection" }));

    await waitFor(() => expect(createCollection).toHaveBeenCalled());
    expect(createCollection.mock.calls[0][0].status).toBe("draft");
  });

  it("needs a name before sending anything", () => {
    const { onCreated } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Create collection" }));
    expect(screen.getByText(/Give the collection a name/)).toBeInTheDocument();
    expect(createCollection).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("picks the existing collection when the name is already taken (any case)", () => {
    const { onCreated } = renderPanel();
    fireEvent.change(screen.getByLabelText("Collection name"), { target: { value: "wedding invitation suite" } });
    fireEvent.click(screen.getByRole("button", { name: "Create collection" }));
    expect(onCreated).toHaveBeenCalledWith(EXISTING[0]);
    expect(createCollection).not.toHaveBeenCalled();
  });

  it("falls back to Invitations for a category that isn't on the list", () => {
    renderPanel({ defaultCategory: "Something Else" });
    expect(screen.getByLabelText("Shown under")).toHaveValue("Invitations");
  });

  it("shows the server's error inline", async () => {
    const error = new Error("Please correct the fields.");
    error.payload = { errors: { name: "A collection with this name already exists." } };
    createCollection.mockRejectedValue(error);
    const { onCreated } = renderPanel({ existingCollections: [] });

    fireEvent.change(screen.getByLabelText("Collection name"), { target: { value: "Wedding Invitation Suite" } });
    fireEvent.click(screen.getByRole("button", { name: "Create collection" }));

    expect(await screen.findByText("A collection with this name already exists.")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("cancels without creating anything", () => {
    const { onCancel } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(createCollection).not.toHaveBeenCalled();
  });
});
