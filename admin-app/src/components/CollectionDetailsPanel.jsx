import { useState } from "react";
import InputField from "./InputField";
import ProductImageUploader from "./ProductImageUploader";
import { updateCollection } from "../lib/adminApi";
import { CATEGORY_OPTIONS } from "../lib/catalogCategories";

/**
 * Edits a collection's own details (name, description, cover, where it's
 * listed, live or draft) from inside the product form, so a collection can be
 * looked after without leaving the product being edited. Changes apply to the
 * collection itself, i.e. to every design in it.
 */
function CollectionDetailsPanel({ token, collection, onSaved, onCancel }) {
  const [draft, setDraft] = useState({
    name: collection.name || "",
    description: collection.description || "",
    coverImage: collection.coverImage || "",
    category: collection.category || "Invitations",
    live: collection.status === "active",
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
      setErrors({ name: "The collection needs a name." });
      return;
    }
    setErrors({});
    setIsSaving(true);
    try {
      const data = await updateCollection(
        collection.id,
        {
          name,
          description: draft.description.trim(),
          coverImage: draft.coverImage,
          category: draft.category,
          status: draft.live ? "active" : "draft",
        },
        token,
      );
      onSaved(data.collection);
    } catch (error) {
      setErrors({ ...(error.payload?.errors || {}), form: error.payload?.errors ? "" : error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="delivery-form-card new-hsn-panel" role="group" aria-label="Edit collection details">
      <p className="eyebrow">Collection details</p>
      <p className="section-copy">These apply to the whole collection, and to every design in it.</p>
      <InputField label="Collection name" htmlFor="edit-collection-name" error={errors.name}>
        <input id="edit-collection-name" type="text" value={draft.name} onChange={setField("name")} />
      </InputField>
      <InputField label="Collection description" htmlFor="edit-collection-description" error={errors.description}>
        <textarea
          id="edit-collection-description"
          rows={3}
          value={draft.description}
          onChange={setField("description")}
        />
      </InputField>
      <InputField
        label="Cover photo"
        htmlFor="edit-collection-cover"
        helperText="Shown on the collection's card and at the top of its page. Uploading a new one replaces it."
      >
        <ProductImageUploader
          images={draft.coverImage ? [draft.coverImage] : []}
          onChange={(images) => setDraft((current) => ({ ...current, coverImage: images[images.length - 1] || "" }))}
          token={token}
        />
      </InputField>
      <InputField label="Shown under" htmlFor="edit-collection-category" error={errors.category}>
        <select id="edit-collection-category" value={draft.category} onChange={setField("category")}>
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
      {errors.form ? (
        <p className="field-error" role="alert">
          {errors.form}
        </p>
      ) : null}
      <div className="action-row">
        <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save collection"}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CollectionDetailsPanel;
