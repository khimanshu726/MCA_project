import { describe, expect, it, vi } from "vitest";

// The page module talks to the admin API at import time only through these;
// stub them so importing the pure helper doesn't need a server.
vi.mock("../../admin-app/src/lib/adminApi", () => ({}));
vi.mock("../../admin-app/src/context/AdminAuthContext", () => ({ useAdminAuth: () => ({ token: "" }) }));

import { buildDuplicatePayload } from "../../admin-app/src/pages/AdminProductsPage";

const form = {
  name: " Royal Rose ",
  description: "Gold foil wedding card",
  category: "Wedding Cards",
  images: ["https://example.com/royal-1.jpg", "https://example.com/royal-2.jpg"],
  price: "120",
  mrp: "150",
  stock: "500",
  minimumOrderQty: "50",
  priceTiers: [{ minQty: "200", price: "100" }],
  hsnCode: "4909",
  collectionId: "col-1",
  designType: "Royal",
  leadTime: "6-8 days",
  sku: "",
  badge: "",
  materials: "Foil, Velvet",
  options: [],
  audience: "",
  status: "active",
  featured: true,
};

describe("duplicating a product", () => {
  it("copies everything into a draft named “(copy)”", () => {
    const payload = buildDuplicatePayload(form);

    expect(payload.name).toBe("Royal Rose (copy)");
    expect(payload.status).toBe("draft");
    expect(payload.featured).toBe(false);
    expect(payload).toMatchObject({
      category: "Wedding Cards",
      images: form.images,
      price: 120,
      mrp: 150,
      stock: 500,
      minimumOrderQty: 50,
      priceTiers: [{ minQty: 200, price: 100 }],
      hsnCode: "4909",
      collectionId: "col-1",
      designType: "Royal",
      materials: ["Foil", "Velvet"],
    });
  });
});
