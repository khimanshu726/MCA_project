import { useState } from "react";
import InputField from "./InputField";
import { createCollection } from "../lib/adminApi";
import { CATEGORY_OPTIONS } from "../lib/catalogCategories";

/**
 * Creates a collection without leaving the product form, so the first design
 * of a new collection (e.g. the first card in "Wedding Invitation Suite") can
 * be put in it straight away. The collection is a normal one: it appears in
 * every product's dropdown and on the Collections page, where its description
 * and cover can be changed later.
 *
 * The product's first photo becomes the cover so the collection card isn't
 * blank. "Show on the shop" is ticked by default; a collection only appears
 * once it has at least one active design anyway.
 *
 * `existingCollections` lets a name that's already taken resolve to that
 * collection instead of an error.
 */
function NewCollectionPanel({ token, existingCollections = [], defaultCategory, defaultCover = "", onCreated, onCancel }) {
  const [draft, setDraft] = useState({
    name: "",
    category: CATEGORY_OPTIONS.includes(defaultCategory) ? defaultCategory : "Invitations",
    live: true,
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      setErrors({ name: "Give the collection a name, e.g. Wedding Invitation Suite." });
      return;
    }

    const existing = existingCollections.find((row) => row.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      onCreated(existing);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      const data = await createCollection(
        {
          name,
          category: draft.category,
          status: draft.live ? "active" : "draft",
          coverImage: defaultCover,
        },
        token,
      );
      onCreated(data.collection);
    } catch (error) {
      setErrors({ ...(error.payload?.errors || {}), form: error.payload?.errors ? "" : error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Not a <form>: it sits inside the product form, and nested forms are
    // invalid HTML (Enter would submit the product instead).
    <div className="delivery-form-card new-hsn-panel" role="group" aria-label="Create a new collection">
      <p className="eyebrow">New collection</p>
      <InputField label="Collection name" htmlFor="new-collection-name" error={errors.name}>
        <input
          id="new-collection-name"
          type="text"
          value={draft.name}
          onChange={setField("name")}
          placeholder="e.g. Wedding Invitation Suite"
        />
      </InputField>
      <InputField
        label="Shown under"
        htmlFor="new-collection-category"
        error={errors.category}
        helperText="The shop category that lists the collection's card."
      >
        <select id="new-collection-category" value={draft.category} onChange={setField("category")}>
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </InputField>
      <label className="checkbox-row">
        <input type="checkbox" checked={draft.live} onChange={setField("live")} />
        Show it on the shop
      </label>
      <p className="section-copy">
        {draft.live
          ? "It appears on the shop once it has at least one active design."
          : "Saved as a draft: customers won't see it until you make it active under Collections."}{" "}
        {defaultCover ? "This product's first photo becomes its cover; change it under Collections." : null}
      </p>
      {errors.form ? (
        <p className="field-error" role="alert">
          {errors.form}
        </p>
      ) : null}
      <div className="action-row">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Creating…" : "Create collection"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default NewCollectionPanel;
