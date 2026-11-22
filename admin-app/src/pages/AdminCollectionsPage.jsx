import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import InputField from "../components/InputField";
import CollectionDesignsList from "../components/CollectionDesignsList";
import ProductImageUploader from "../components/ProductImageUploader";
import { createCollection, deleteCollection, fetchAdminCollections, updateCollection } from "../lib/adminApi";
import { CATEGORY_OPTIONS } from "../lib/catalogCategories";
import { rowKeyHandler, useStackedReveal } from "../lib/useStackedReveal";

const EMPTY_FORM = {
  name: "",
  description: "",
  coverImage: "",
  category: "Invitations",
  status: "draft",
  legacyProductIds: "",
};

const toForm = (row) => ({
  name: row.name || "",
  description: row.description || "",
  coverImage: row.coverImage || "",
  category: row.category || "Invitations",
  status: row.status || "draft",
  legacyProductIds: (row.legacyProductIds || []).join(", "),
});

const toPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  coverImage: form.coverImage,
  category: form.category,
  status: form.status,
  legacyProductIds: form.legacyProductIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
});

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

/**
 * Collections group many products under one storefront page, e.g. "Wedding
 * Invitation Suite" holding every wedding card design. The designs themselves
 * are ordinary products: add them on the Products page and pick this
 * collection there.
 */
function AdminCollectionsPage() {
  const { token } = useAdminAuth();
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { panelRef, listRef, revealPanel, revealList } = useStackedReveal();

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchAdminCollections(token);
      setRows(data.collections || []);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm(toForm(row));
    setFieldErrors({});
    setMessage("");
    revealPanel();
  };

  const startNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setMessage("");
    revealPanel();
  };

  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    if (!form.name.trim()) {
      setFieldErrors({ name: "Give the collection a name." });
      return;
    }
    setIsSaving(true);
    setFieldErrors({});
    setMessage("");
    try {
      const payload = toPayload(form);
      const data = editingId
        ? await updateCollection(editingId, payload, token)
        : await createCollection(payload, token);
      await load();
      setEditingId(data.collection.id);
      setForm(toForm(data.collection));
      setMessage(
        data.collection.status === "active"
          ? "Saved. It shows on the storefront once it has at least one active design."
          : "Saved as draft. Customers won't see it until it's active.",
      );
    } catch (error) {
      setFieldErrors(error.payload?.errors || {});
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setIsSaving(true);
    setMessage("");
    try {
      await deleteCollection(editingId, token);
      startNew();
      await load();
      setMessage("Collection deleted.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const editingRow = rows.find((row) => row.id === editingId);

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Catalogue</p>
          <h2>Collections</h2>
          <p className="section-copy">
            A collection is one storefront page holding many designs, like every wedding card in Wedding Invitation
            Suite. Open a collection to see its designs and add new ones with &ldquo;+ Add a design&rdquo;. Each design
            keeps its own photos, price, stock and HSN code, and shows on the shop once its Status is active.
          </p>
        </div>
      </section>

      <section className="section-panel admin-dashboard-layout">
        <div ref={listRef} tabIndex={-1}>
          {loadError ? <p className="field-error">{loadError}</p> : null}
          {isLoading ? (
            <p className="section-copy">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="summary-card">
              <p className="section-copy">No collections yet. Add the first one.</p>
            </div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Collection</th>
                  <th>Category</th>
                  <th>Designs</th>
                  <th>From</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    onClick={() => startEdit(row)}
                    onKeyDown={rowKeyHandler(() => startEdit(row))}
                    className={row.id === editingId ? "selected-row" : ""}
                  >
                    <td>
                      <strong>{row.name}</strong>
                      <span>/collections/{row.slug}</span>
                    </td>
                    <td data-label="Category">{row.category}</td>
                    <td data-label="Designs">{row.productCount}</td>
                    <td data-label="From">{row.minPrice == null ? "—" : formatMoney(row.minPrice)}</td>
                    <td data-label="Status">
                      <span className={`status-badge status-${row.status}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="action-row" style={{ marginTop: "0.75rem" }}>
            <button type="button" className="secondary-button" onClick={startNew}>
              + Add collection
            </button>
          </div>
        </div>

        <form
          ref={panelRef}
          tabIndex={-1}
          className="delivery-form-card admin-product-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="admin-panel-head">
            <h3>{editingId ? `Edit ${editingRow?.name || "collection"}` : "New collection"}</h3>
            <button type="button" className="ghost-button admin-back-to-list" onClick={revealList}>
              Back to list
            </button>
          </div>

          <InputField label="Name" htmlFor="c-name" error={fieldErrors.name}>
            <input id="c-name" type="text" value={form.name} onChange={setField("name")} />
          </InputField>
          <InputField label="Description" htmlFor="c-description" error={fieldErrors.description}>
            <textarea id="c-description" rows={3} value={form.description} onChange={setField("description")} />
          </InputField>
          <InputField
            label="Cover photo"
            htmlFor="c-cover"
            helperText="Shown on the collection's card and at the top of its page. Uploading a new one replaces it."
          >
            <ProductImageUploader
              images={form.coverImage ? [form.coverImage] : []}
              onChange={(images) => setForm((current) => ({ ...current, coverImage: images[images.length - 1] || "" }))}
              token={token}
            />
          </InputField>
          <div className="admin-filters-grid">
            <InputField
              label="Shown under"
              htmlFor="c-category"
              error={fieldErrors.category}
              helperText="The storefront category that lists this collection."
            >
              <select id="c-category" value={form.category} onChange={setField("category")}>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </InputField>
            <InputField label="Status" htmlFor="c-status">
              <select id="c-status" value={form.status} onChange={setField("status")}>
                <option value="draft">draft</option>
                <option value="active">active</option>
              </select>
            </InputField>
          </div>
          <InputField
            label="Old product links to send here"
            htmlFor="c-legacy"
            error={fieldErrors.legacyProductIds}
            helperText="Product ids, comma-separated (e.g. wedding-suite). Once that product is archived, its old link opens this collection."
          >
            <input id="c-legacy" type="text" value={form.legacyProductIds} onChange={setField("legacyProductIds")} />
          </InputField>

          {editingRow ? <CollectionDesignsList key={editingRow.id} token={token} collection={editingRow} /> : null}
          {message ? (
            <p className="section-copy" role="status">
              {message}
            </p>
          ) : null}

          <div className="action-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving…" : editingId ? "Save changes" : "Create collection"}
            </button>
            {editingId ? (
              <button type="button" className="secondary-button danger-button" disabled={isSaving} onClick={remove}>
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}

export default AdminCollectionsPage;
