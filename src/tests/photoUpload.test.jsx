import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const addToCart = vi.fn();
const uploadCustomerPhoto = vi.fn();
const readImageFiles = vi.fn();

vi.mock("../hooks/useCart", () => ({ useCart: () => ({ addToCart, cartItemIds: new Set() }) }));
vi.mock("../context/UserAuthContext", () => ({ useUserAuth: () => ({ token: "" }) }));
vi.mock("../api/customerPhotosApi", () => ({ uploadCustomerPhoto: (...args) => uploadCustomerPhoto(...args) }));
vi.mock("../customizer/components/UploadDropzone", () => ({ readImageFiles: (...args) => readImageFiles(...args) }));

import AddToCartButton from "../components/AddToCartButton";
import PhotoCapsule from "../components/PhotoCapsule";
import { buildOrderFormData } from "../utils/checkout";
import { clearPersonalPhoto, getPersonalPhoto, setPersonalPhoto } from "../utils/personalPhotos";

const wallArt = {
  id: "wall-art",
  name: "Personalized Wall Art",
  price: 650,
  stock: 50,
  minimumOrderQty: 1,
  photoUpload: true,
};
const file = new File(["x"], "family.jpg", { type: "image/jpeg" });

const pickPhoto = async (size = 2400) => {
  readImageFiles.mockResolvedValue({
    images: [{ src: "blob:preview", naturalWidth: size, naturalHeight: size, file }],
    error: "",
  });
  fireEvent.change(screen.getByLabelText("Choose a photo"), { target: { files: [file] } });
  await screen.findByAltText("Your selected photo");
};

beforeEach(() => {
  addToCart.mockReset().mockResolvedValue(undefined);
  uploadCustomerPhoto.mockReset();
  readImageFiles.mockReset();
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  act(() => clearPersonalPhoto("wall-art"));
});

describe("Add to cart on a personalised product", () => {
  it("asks for the photo first, uploads it, then adds to the cart", async () => {
    uploadCustomerPhoto.mockResolvedValue({ photo: { id: "ph1", name: "family.jpg" } });
    render(<AddToCartButton product={wallArt} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(addToCart).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Personalized Wall Art");

    await pickPhoto();
    fireEvent.click(screen.getByRole("button", { name: "Use this photo & add to cart" }));

    await waitFor(() => expect(addToCart).toHaveBeenCalledWith(wallArt, 1));
    expect(uploadCustomerPhoto).toHaveBeenCalledWith({ productId: "wall-art", file, token: "" });
    expect(getPersonalPhoto("wall-art")).toMatchObject({ id: "ph1" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds straight away once a photo is already there", async () => {
    act(() => setPersonalPhoto("wall-art", { id: "ph1", name: "family.jpg" }));
    render(<AddToCartButton product={wallArt} />);

    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await waitFor(() => expect(addToCart).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open with the reason when the upload fails", async () => {
    uploadCustomerPhoto.mockRejectedValue(new Error("Too many photo uploads."));
    render(<AddToCartButton product={wallArt} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await pickPhoto();
    fireEvent.click(screen.getByRole("button", { name: "Use this photo & add to cart" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many photo uploads.");
    expect(addToCart).not.toHaveBeenCalled();
    expect(getPersonalPhoto("wall-art")).toBeNull();
  });
});

describe("the photo capsule", () => {
  it("invites an upload, then shows the photo with Change", async () => {
    uploadCustomerPhoto.mockResolvedValue({ photo: { id: "ph2", name: "me.jpg" } });
    render(<PhotoCapsule product={wallArt} />);

    fireEvent.click(screen.getByRole("button", { name: "Upload your photo for Personalized Wall Art" }));
    await pickPhoto(800);
    expect(screen.getByRole("note")).toHaveTextContent(/quite small/);
    fireEvent.click(screen.getByRole("button", { name: "Use this photo" }));

    const capsule = await screen.findByRole("button", { name: "Change your photo for Personalized Wall Art" });
    expect(capsule).toHaveTextContent("Photo added");
    // The server sends no link back (the photo is private). jsdom can't draw a
    // preview, so the capsule shows a check instead of the thumbnail.
    expect(capsule.querySelector("img")).toBeNull();
    expect(capsule.querySelector(".photo-capsule-done")).not.toBeNull();
    expect(getPersonalPhoto("wall-art")).toEqual({ id: "ph2", name: "me.jpg", thumb: "" });
  });

  it("shows the reason when the file isn't a usable image", async () => {
    render(<PhotoCapsule product={wallArt} />);
    fireEvent.click(screen.getByRole("button", { name: /Upload your photo/ }));
    readImageFiles.mockResolvedValue({ images: [], error: "Only PNG, JPG, and WebP images are supported." });
    fireEvent.change(screen.getByLabelText("Choose a photo"), { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Only PNG, JPG, and WebP");
  });
});

describe("the order sends each line's photo", () => {
  it("adds photoId for a line with a photo and leaves it empty otherwise", () => {
    act(() => setPersonalPhoto("wall-art", { id: "ph9", name: "a.jpg" }));
    const formData = buildOrderFormData({
      effectiveAddress: { fullName: "A", phoneNumber: "1", addressLine1: "x", city: "c", state: "s", pincode: "1" },
      email: "a@b.c",
      paymentMethod: "cod",
      shipping: 0,
      customInstructions: "",
      cartItems: [
        { id: "wall-art", name: "Wall Art", quantity: 1, price: 650 },
        { id: "mug", name: "Mug", quantity: 2, price: 300 },
      ],
    });
    const lines = JSON.parse(formData.get("lineItems"));
    expect(lines.map((line) => line.photoId)).toEqual(["ph9", ""]);
  });
});

describe("the photo memory", () => {
  it("still works for this visit when storage refuses writes", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    act(() => setPersonalPhoto("wall-art", { id: "ph3", name: "b.jpg" }));
    expect(getPersonalPhoto("wall-art")).toMatchObject({ id: "ph3" });
    setItem.mockRestore();
  });

  it("ignores a photo without an id", () => {
    act(() => setPersonalPhoto("wall-art", { id: "", name: "x.jpg" }));
    expect(getPersonalPhoto("wall-art")).toBeNull();
  });

  it("keeps the browser's own preview and shows it in the capsule", () => {
    const thumb = "data:image/jpeg;base64,AAAA";
    act(() => setPersonalPhoto("wall-art", { id: "ph4", name: "c.jpg", thumb, url: "https://public.example/x.jpg" }));
    expect(getPersonalPhoto("wall-art")).toEqual({ id: "ph4", name: "c.jpg", thumb });
    render(<PhotoCapsule product={wallArt} />);
    expect(screen.getByRole("button", { name: /Change your photo/ }).querySelector("img")).toHaveAttribute(
      "src",
      thumb,
    );
  });
});
