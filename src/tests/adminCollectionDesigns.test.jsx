import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../admin-app/src/lib/adminApi", () => ({
  fetchAdminProducts: vi.fn(),
  updateCollectionDesigns: vi.fn(),
}));

import { fetchAdminProducts, updateCollectionDesigns } from "../../admin-app/src/lib/adminApi";
import CollectionDesignsList from "../../admin-app/src/components/CollectionDesignsList";
import DesignPhotoPicker from "../../admin-app/src/components/DesignPhotoPicker";
import { buildNewDesignForm, pickDesignTemplate, savedMessage } from "../../admin-app/src/pages/AdminProductsPage";

const SUITE = { id: "col-1", name: "Wedding Invitation Suite", category: "Wedding Cards", status: "active" };

describe("the designs in a collection, on the Collections page", () => {
  beforeEach(() => {
    fetchAdminProducts.mockReset();
    updateCollectionDesigns.mockReset();
  });

  it("lists every design, flags the ones not on the shop, and adds new ones into this collection", async () => {
    fetchAdminProducts.mockResolvedValue({
      items: [
        {
          id: "wedding-suite",
          name: "Wedding Invitation Suite",
          price: 92,
          status: "active",
          designType: "",
          category: "Wedding Cards",
        },
        {
          id: "red-fancy",
          name: "Wedding card red fancy",
          price: 150,
          status: "draft",
          designType: "Royal",
          category: "Wedding Cards",
        },
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

  it("says whether a standalone product is on the shop", () => {
    expect(savedMessage({ wasEditing: false, product: { status: "draft" }, collection: null })).toBe(
      "Product created. It's a draft, so customers won't see it until you set Status to active.",
    );
    expect(savedMessage({ wasEditing: true, product: { status: "active" }, collection: null })).toBe(
      "Product updated. It's live on the shop.",
    );
  });
});

describe("managing designs from the list", () => {
  const DRAFTS = [
    { id: "a", name: "Card A", price: 90, status: "draft", category: "Wedding Cards", images: ["https://x/a.jpg"] },
    { id: "b", name: "Card B", price: 95, status: "draft", category: "Invitations", images: [] },
    { id: "c", name: "Card C", price: 99, status: "active", category: "Wedding Cards", images: ["https://x/c.jpg"] },
  ];
  const renderList = (onChanged = vi.fn()) => {
    render(
      <MemoryRouter>
        <CollectionDesignsList
          token="tok"
          collection={SUITE}
          collectionNames={new Map([["col-2", "Birthday Cards"]])}
          onChanged={onChanged}
        />
      </MemoryRouter>,
    );
    return onChanged;
  };

  beforeEach(() => {
    fetchAdminProducts.mockReset();
    updateCollectionDesigns.mockReset();
    updateCollectionDesigns.mockResolvedValue({
      collection: { ...SUITE, productCount: 3 },
      changed: { added: 2, removed: 1, published: 2, recategorized: 1 },
    });
  });

  it("shows each design's photo, and publishes one or all hidden designs", async () => {
    fetchAdminProducts.mockResolvedValue({ items: DRAFTS });
    const onChanged = renderList();
    await screen.findByText("Card A");
    expect(document.querySelectorAll("img.collection-design-thumb")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Publish Card A" }));
    await waitFor(() => expect(updateCollectionDesigns).toHaveBeenCalledWith("col-1", { publish: ["a"] }, "tok"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ ...SUITE, productCount: 3 }));

    fireEvent.click(await screen.findByRole("button", { name: "Publish all 2" }));
    await waitFor(() =>
      expect(updateCollectionDesigns).toHaveBeenLastCalledWith("col-1", { publish: ["a", "b"] }, "tok"),
    );
    expect(await screen.findByText("2 designs are now on the shop.")).toBeInTheDocument();
  });

  it("removes a design only after confirming", async () => {
    fetchAdminProducts.mockResolvedValue({ items: DRAFTS });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderList();
    await screen.findByText("Card C");

    fireEvent.click(screen.getByRole("button", { name: "Remove Card C from the collection" }));
    expect(updateCollectionDesigns).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove Card C from the collection" }));
    await waitFor(() => expect(updateCollectionDesigns).toHaveBeenCalledWith("col-1", { remove: ["c"] }, "tok"));
    confirm.mockRestore();
  });

  it("lines up designs listed under another category", async () => {
    fetchAdminProducts.mockResolvedValue({ items: DRAFTS });
    renderList();
    await screen.findByText(/1 design is listed under Invitations/);
    fireEvent.click(screen.getByRole("button", { name: "List all under Wedding Cards" }));
    await waitFor(() =>
      expect(updateCollectionDesigns).toHaveBeenCalledWith("col-1", { category: "Wedding Cards" }, "tok"),
    );
  });

  it("adds several existing products at once, saying which will move from another collection", async () => {
    fetchAdminProducts.mockImplementation((_token, filters) =>
      Promise.resolve(
        filters.collection
          ? { items: [] }
          : {
              items: [
                { id: "in-here", name: "Already in", category: "Wedding Cards", collectionId: "col-1" },
                { id: "loose", name: "Gold foil card", category: "Wedding Cards", collectionId: "" },
                { id: "moving", name: "Pink card", category: "Invitations", collectionId: "col-2" },
              ],
            },
      ),
    );
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: "+ Add existing products…" }));

    expect(await screen.findByText("Gold foil card")).toBeInTheDocument();
    expect(screen.queryByText("Already in")).not.toBeInTheDocument();
    expect(screen.getByText(/now in Birthday Cards \(will move\)/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search products"), { target: { value: "card" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Gold foil card/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Pink card/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add 2 to Wedding Invitation Suite" }));

    await waitFor(() =>
      expect(updateCollectionDesigns).toHaveBeenCalledWith("col-1", { add: ["loose", "moving"] }, "tok"),
    );
    expect(await screen.findByText("Added 2 products to Wedding Invitation Suite.")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Add existing products" })).not.toBeInTheDocument();
  });
});

describe("new designs start from the collection's newest design", () => {
  const TEMPLATE = {
    id: "older",
    name: "Royal red",
    description: "Foil-stamped card",
    category: "Invitations",
    images: ["https://x/r.jpg"],
    price: 120,
    mrp: 150,
    stock: 2000,
    minimumOrderQty: 50,
    priceTiers: [{ minQty: 200, price: 100 }],
    hsnCode: "4909",
    leadTime: "5 days",
    sku: "WR-1",
    badge: "Bestseller",
    designType: "Royal",
    materials: ["Foil"],
    options: [{ label: "Envelope", values: ["Gold", "Red"] }],
    audience: "Weddings",
    status: "draft",
  };

  it("copies the shared settings, and leaves name, photos, SKU and type for the new card", () => {
    expect(buildNewDesignForm(SUITE, TEMPLATE)).toMatchObject({
      collectionId: "col-1",
      category: "Wedding Cards",
      status: "active",
      description: "Foil-stamped card",
      hsnCode: "4909",
      price: "120",
      mrp: "150",
      priceTiers: [{ minQty: "200", price: "100" }],
      stock: "2000",
      minimumOrderQty: "50",
      leadTime: "5 days",
      materials: "Foil",
      options: [{ label: "Envelope", values: "Gold, Red" }],
      audience: "Weddings",
      name: "",
      images: [],
      sku: "",
      badge: "",
      designType: "",
    });
  });

  it("picks the most recently added design", () => {
    expect(
      pickDesignTemplate([
        { id: "a", createdAt: "2026-11-01T00:00:00Z" },
        { id: "b", createdAt: "2026-11-20T00:00:00Z" },
        { id: "c", createdAt: "2026-11-10T00:00:00Z" },
      ]).id,
    ).toBe("b");
    expect(pickDesignTemplate([])).toBeNull();
  });
});

describe("choosing the cover from a design's photo", () => {
  it("offers the designs' photos once each and picks one", async () => {
    fetchAdminProducts.mockReset();
    fetchAdminProducts.mockResolvedValue({
      items: [{ images: ["https://x/1.jpg", "https://x/2.jpg"] }, { images: ["https://x/1.jpg"] }],
    });
    const onPick = vi.fn();
    render(<DesignPhotoPicker token="tok" collectionId="col-1" value="https://x/2.jpg" onPick={onPick} />);

    const first = await screen.findByRole("button", { name: "Use design photo 1 as the cover" });
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Use design photo 2 as the cover" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(first);
    expect(onPick).toHaveBeenCalledWith("https://x/1.jpg");
  });
});

describe("the quantity steps hint in the product form", async () => {
  const { quantityStepHint } = await import("../../admin-app/src/pages/AdminProductsPage");

  it("spells out what customers can pick", () => {
    expect(quantityStepHint({ minimumOrderQty: "100", quantityStep: "50" })).toBe(
      "Customers can order 100, 150, 200… (the + and − buttons move by 50).",
    );
    expect(quantityStepHint({ minimumOrderQty: "1", quantityStep: "1" })).toMatch(/any amount from 1/);
  });
});

describe("after creating a product, the form starts the next one", async () => {
  const { buildNextProductForm } = await import("../../admin-app/src/pages/AdminProductsPage");

  it("is a blank new product that keeps the shared settings", () => {
    const saved = {
      id: "abada7d1",
      code: "EI-0016",
      name: "Yellow and Golden Card",
      description: "Yellow card with a ganesha sticker.",
      images: ["https://x/y.jpg"],
      category: "Wedding Cards",
      collectionId: "col-1",
      designType: "Default Hindi",
      sku: "WC-16",
      badge: "New",
      price: 26,
      mrp: 30,
      stock: 1000,
      minimumOrderQty: 100,
      quantityStep: 50,
      priceTiers: [{ minQty: 500, price: 22 }],
      hsnCode: "49090010",
      leadTime: "6",
      materials: ["Hard Paper Card", "PVC Sticker"],
      options: [],
      status: "active",
    };
    expect(buildNextProductForm(saved)).toMatchObject({
      name: "",
      description: "",
      images: [],
      sku: "",
      badge: "",
      designType: "",
      category: "Wedding Cards",
      collectionId: "col-1",
      status: "active",
      price: "26",
      mrp: "30",
      stock: "1000",
      minimumOrderQty: "100",
      quantityStep: "50",
      priceTiers: [{ minQty: "500", price: "22" }],
      hsnCode: "49090010",
      leadTime: "6",
      materials: "Hard Paper Card, PVC Sticker",
    });
  });
});
