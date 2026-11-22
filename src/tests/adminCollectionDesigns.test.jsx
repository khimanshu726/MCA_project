import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../admin-app/src/lib/adminApi", () => ({
  fetchAdminProducts: vi.fn(),
}));

import { fetchAdminProducts } from "../../admin-app/src/lib/adminApi";
import CollectionDesignsList from "../../admin-app/src/components/CollectionDesignsList";
import { buildNewDesignForm, savedMessage } from "../../admin-app/src/pages/AdminProductsPage";

const SUITE = { id: "col-1", name: "Wedding Invitation Suite", category: "Wedding Cards", status: "active" };

describe("the designs in a collection, on the Collections page", () => {
  beforeEach(() => fetchAdminProducts.mockReset());

  it("lists every design, flags the ones not on the shop, and adds new ones into this collection", async () => {
    fetchAdminProducts.mockResolvedValue({
      items: [
        { id: "wedding-suite", name: "Wedding Invitation Suite", price: 92, status: "active", designType: "" },
        { id: "red-fancy", name: "Wedding card red fancy", price: 150, status: "draft", designType: "Royal" },
      ],
    });
    render(
      <MemoryRouter>
        <CollectionDesignsList token="tok" collection={SUITE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Wedding card red fancy")).toBeInTheDocument();
    expect(fetchAdminProducts).toHaveBeenCalledWith("tok", { collection: "col-1", limit: 100 });
    expect(screen.getByText("on the shop")).toBeInTheDocument();
    expect(screen.getByText("draft · hidden")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("1 design is not on the shop yet");
    expect(screen.getByRole("link", { name: "+ Add a design" })).toHaveAttribute(
      "href",
      "/admin/products?addTo=col-1",
    );
    expect(screen.getByRole("link", { name: /Wedding card red fancy/ })).toHaveAttribute(
      "href",
      "/admin/products?edit=red-fancy",
    );
  });

  it("invites the first design when the collection is empty", async () => {
    fetchAdminProducts.mockResolvedValue({ items: [] });
    render(
      <MemoryRouter>
        <CollectionDesignsList token="tok" collection={SUITE} />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No designs yet/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("adding a design from a collection", () => {
  it("starts the new product inside the collection, under its category, set to go live", () => {
    const form = buildNewDesignForm(SUITE);
    expect(form).toMatchObject({ collectionId: "col-1", category: "Wedding Cards", status: "active", name: "" });
  });

  it("falls back to the default category for one that isn't on the list", () => {
    expect(buildNewDesignForm({ ...SUITE, category: "Something Else" }).category).not.toBe("Something Else");
  });
});

describe("the message after saving a design", () => {
  it("says it's live in the collection", () => {
    expect(savedMessage({ wasEditing: false, product: { status: "active" }, collection: SUITE })).toBe(
      "Product created. It's live in “Wedding Invitation Suite”.",
    );
  });

  it("warns that a draft design won't show in the collection", () => {
    expect(savedMessage({ wasEditing: true, product: { status: "draft" }, collection: SUITE })).toMatch(
      /^Product updated\. It's a draft, so it won't show in “Wedding Invitation Suite” on the shop until you set Status to active\./,
    );
  });

  it("warns when the collection itself is a draft", () => {
    expect(
      savedMessage({ wasEditing: false, product: { status: "active" }, collection: { ...SUITE, status: "draft" } }),
    ).toMatch(/that collection is a draft/);
  });

  it("stays plain for a standalone product", () => {
    expect(savedMessage({ wasEditing: false, product: { status: "draft" }, collection: null })).toBe(
      "Product created.",
    );
  });
});
