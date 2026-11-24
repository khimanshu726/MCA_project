import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { clearDraft, loadDraft, saveDraft, useFormDraft } from "../../admin-app/src/lib/useFormDraft";
import { isFormDirty, pickDraftToRestore } from "../../admin-app/src/pages/AdminProductsPage";

const KEY = "test-draft";

describe("useFormDraft", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves unsaved work shortly after a change", () => {
    const { rerender } = renderHook(({ value, keep }) => useFormDraft(KEY, value, keep), {
      initialProps: { value: { form: { name: "" } }, keep: false },
    });
    rerender({ value: { form: { name: "Royal Red" } }, keep: true });
    expect(loadDraft(KEY)).toBeNull();
    vi.advanceTimersByTime(400);
    expect(loadDraft(KEY)).toMatchObject({ form: { name: "Royal Red" } });
    expect(loadDraft(KEY).savedAt).toEqual(expect.any(String));
  });

  it("saves at once when the page goes away, e.g. signed out by an expired session", () => {
    const { rerender, unmount } = renderHook(({ value, keep }) => useFormDraft(KEY, value, keep), {
      initialProps: { value: { form: { name: "" } }, keep: false },
    });
    rerender({ value: { form: { name: "Typed just now" } }, keep: true });
    unmount();
    expect(loadDraft(KEY)).toMatchObject({ form: { name: "Typed just now" } });
  });

  it("clears the draft once the work is saved, and leaves it alone until it has been restored", () => {
    saveDraft(KEY, { form: { name: "Earlier work" } });
    const { rerender } = renderHook(({ keep }) => useFormDraft(KEY, { form: { name: "" } }, keep), {
      initialProps: { keep: null },
    });
    vi.advanceTimersByTime(1000);
    expect(loadDraft(KEY)).toMatchObject({ form: { name: "Earlier work" } });

    rerender({ keep: false });
    vi.advanceTimersByTime(400);
    expect(loadDraft(KEY)).toBeNull();
  });

  it("never throws when storage is unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    expect(loadDraft(KEY)).toBeNull();
    expect(() => saveDraft(KEY, { a: 1 })).not.toThrow();
    expect(() => clearDraft(KEY)).not.toThrow();
    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("restoring a product draft", () => {
  const product = {
    id: "red",
    name: "Fancy Red",
    description: "Card",
    category: "Wedding Cards",
    images: ["https://x/red.jpg"],
    price: 32,
    mrp: 40,
    stock: 500,
    minimumOrderQty: 100,
    status: "active",
  };

  it("reopens the product it was editing, with the unsaved values", () => {
    const restore = pickDraftToRestore(
      { editingId: "red", form: { name: "Fancy Red v2", price: "35" }, savedAt: "2026-11-24T10:42:00Z" },
      [product],
    );
    expect(restore).toMatchObject({ editingId: "red", deleted: false, savedAt: "2026-11-24T10:42:00Z" });
    expect(restore.form).toMatchObject({ name: "Fancy Red v2", price: "35", category: expect.any(String) });
    expect(restore.baseline).toMatchObject({ name: "Fancy Red", price: "32" });
    expect(isFormDirty(restore.form, restore.baseline)).toBe(true);
  });

  it("reopens a new product that wasn't saved yet", () => {
    const restore = pickDraftToRestore({ editingId: null, form: { name: "New card" } }, [product]);
    expect(restore).toMatchObject({ editingId: null, deleted: false });
    expect(restore.form.name).toBe("New card");
  });

  it("turns a draft for a since-deleted product into a new product, and says so", () => {
    const restore = pickDraftToRestore({ editingId: "gone", form: { name: "Was editing" } }, [product]);
    expect(restore).toMatchObject({ editingId: null, deleted: true });
  });

  it("ignores nothing or junk", () => {
    expect(pickDraftToRestore(null, [product])).toBeNull();
    expect(pickDraftToRestore({ form: "oops" }, [product])).toBeNull();
  });

  it("only counts real changes as unsaved", () => {
    expect(isFormDirty({ name: "A" }, { name: "A" })).toBe(false);
    expect(isFormDirty({ name: "A" }, { name: "B" })).toBe(true);
  });
});
