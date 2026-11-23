import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The buttons pull in the cart/auth stack; this test is only about the photo.
vi.mock("../components/AddToCartButton", () => ({ default: () => <button type="button">Add to cart</button> }));
vi.mock("../components/ui/WishlistButton", () => ({ default: () => null }));

import ProductCard from "../components/ProductCard";
import CollectionCard from "../components/CollectionCard";

const PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/products/red-card.jpg";

describe("card photos in product grids", () => {
  it("shows a product's whole photo in a square frame, uncropped", () => {
    render(
      <MemoryRouter>
        <ProductCard product={{ id: "red", name: "Red Card", category: "Wedding Cards", price: 32, images: [PHOTO] }} />
      </MemoryRouter>,
    );
    const img = screen.getByAltText("Red Card");
    expect(img.closest(".image-shell")).toHaveClass("ratio-square", "fit-contain");
    expect(img.getAttribute("src")).toContain("/upload/w_480,q_auto,f_auto/");
    expect(img.getAttribute("src")).not.toContain("c_fill");
  });

  it("does the same for a collection card", () => {
    render(
      <MemoryRouter>
        <CollectionCard
          collection={{ id: "c", slug: "suite", name: "Suite", category: "Wedding Cards", coverImage: PHOTO }}
        />
      </MemoryRouter>,
    );
    const img = screen.getByAltText("Suite");
    expect(img.closest(".image-shell")).toHaveClass("ratio-square", "fit-contain");
    expect(img.getAttribute("src")).not.toContain("c_fill");
  });
});
