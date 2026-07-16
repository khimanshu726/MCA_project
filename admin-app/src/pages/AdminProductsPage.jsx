import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createProduct,
  deleteProduct,
  fetchAdminProducts,
  fetchHealth,
  updateProduct,
} from "../lib/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import InputField from "../components/InputField";
import ProductImageUploader from "../components/ProductImageUploader";
// The one source of truth for "buyable", shared with the storefront and the
// server (src/utils/productAvailability.js). Using it here means the admin sees
// exactly the availability the customer will.
import {
  getMinimumOrderQty,
  isProductLowStock,
  isProductOutOfStock,
} from "../../../src/utils/productAvailability";

const productCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatMoney = (value) => productCurrency.format(value || 0);

// Free-text on the model, but a fixed list keeps the storefront's categories
// coherent; the storefront filters and studio templates key off these exact
// strings.
const CATEGORY_OPTIONS = [
  "Visiting Cards",
  "Marketing Materials",
  "Banners",
  "Invitations",
  "Photo Gifts",
  "Stationery",
  "Clothing & Merchandise",
  "Labels & Packaging",
];
const STATUS_OPTIONS = ["active", "draft", "archived"];

// `images` is a real array (the uploader owns it); `materials` is still edited
// as comma-separated text, which suits a short list of finish names.
const EMPTY_FORM = {
  name: "",
  description: "",
  category: CATEGORY_OPTIONS[0],
  images: [],
  price: "",
  mrp: "",
  stock: "",
  minimumOrderQty: "1",
  leadTime: "",
  sku: "",
  badge: "",
  materials: "",
  audience: "",
  status: "draft",
  featured: false,
};

const toForm = (product) => ({
  name: product.name || "",
  description: product.description || "",
  category: product.category || CATEGORY_OPTIONS[0],
  images: product.images || [],
  price: String(product.price ?? ""),
  mrp: String(product.mrp ?? ""),
  stock: String(product.stock ?? ""),
  minimumOrderQty: String(product.minimumOrderQty ?? "1"),
  leadTime: product.leadTime || "",
  sku: product.sku || "",
  badge: product.badge || "",
  materials: (product.materials || []).join(", "),
  audience: product.audience || "",
  status: product.status || "draft",
  featured: Boolean(product.featured),
});

const splitList = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const toPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  category: form.category,
  images: form.images,
  price: Number(form.price),
  mrp: form.mrp === "" ? Number(form.price) : Number(form.mrp),
  stock: Number(form.stock || 0),
  minimumOrderQty: Number(form.minimumOrderQty || 1),
  leadTime: form.leadTime.trim(),
  sku: form.sku.trim(),
  badge: form.badge.trim(),
  materials: splitList(form.materials),
  audience: form.audience.trim(),
  status: form.status,
  featured: form.featured,
});

// The exact state that spawned this whole feature: stock that can't satisfy the
// product's own minimum, so nobody can buy it. Surfaced live, while the number
// is being typed, rather than discovered later by a customer.
//
// Returns null for a blank stock field — a brand-new form shouldn't open with a
// red "unsellable" warning about a value the admin hasn't entered yet.
const availabilityFromForm = (form) => {
  if (String(form.stock).trim() === "") {
    return null;
  }

  const probe = { stock: Number(form.stock), minimumOrderQty: Number(form.minimumOrderQty || 1) };

  if (probe.stock === 0) {
    return { tone: "warn", label: "Out of stock — hidden from customers until restocked." };
  }
  if (isProductOutOfStock(probe)) {
    return {
      tone: "danger",
      label: `Unsellable: ${probe.stock} in stock but the minimum order is ${probe.minimumOrderQty}. Nobody can buy this.`,
    };
  }
  if (isProductLowStock(probe)) {
    return { tone: "warn", label: `Low stock — only ${probe.stock} left.` };
  }
  return { tone: "ok", label: `Sellable — ${probe.stock} in stock.` };
};

function StockCell({ product }) {
  if (isProductOutOfStock(product)) {
    return (
      <span className="status-badge status-cancelled" title={`Stock ${product.stock} < MOQ ${getMinimumOrderQty(product)}`}>
        {product.stock} · unsellable
      </span>
    );
  }
  if (isProductLowStock(product)) {
    return <span className="status-badge status-packed">{product.stock} · low</span>;
  }
  return <span>{product.stock}</span>;
}

function AdminProductsPage() {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ query: "", status: "All", category: "All" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Asked up front rather than discovered by a failed upload: without
  // Cloudinary in production the server refuses photos, and an admin should
  // learn that from a banner, not from a 503 after picking a file.
  const [storageDurable, setStorageDurable] = useState(true);

  const [editingId, setEditingId] = useState(null); // null = creating
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetchAdminProducts(token, {
        q: filters.query,
        status: filters.status === "All" ? "" : filters.status,
        category: filters.category === "All" ? "" : filters.category,
        limit: 100,
      });
      setProducts(response.items);
    } catch (loadError) {
      setError(loadError.message || "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.query, filters.status, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    // A failed health check shouldn't disable the uploader — assume storage is
    // fine and let the upload itself report the truth.
    fetchHealth()
      .then((health) => setStorageDurable(health.uploads?.durable !== false))
      .catch(() => setStorageDurable(true));
  }, []);

  const metrics = useMemo(() => {
    const active = products.filter((product) => product.status === "active");
    const unsellable = active.filter((product) => isProductOutOfStock(product));
    return { total: products.length, active: active.length, unsellable: unsellable.length };
  }, [products]);

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setActionMessage("");
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm(toForm(product));
    setFieldErrors({});
    setActionMessage("");
  };

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFieldErrors({});
    setActionMessage("");

    const payload = toPayload(form);

    try {
      const response = editingId
        ? await updateProduct(editingId, payload, token)
        : await createProduct(payload, token);

      setActionMessage(editingId ? "Product updated." : "Product created.");
      await loadProducts();

      // Stay on the freshly saved product so the admin can keep tuning stock.
      const saved = response.product;
      setEditingId(saved.id);
      setForm(toForm(saved));
    } catch (saveError) {
      if (saveError.payload?.errors) {
        setFieldErrors(saveError.payload.errors);
        setActionMessage("Please correct the highlighted fields.");
      } else {
        setActionMessage(saveError.message || "Unable to save the product.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId || !window.confirm(`Delete ${form.name || "this product"}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteProduct(editingId, token);
      setActionMessage("Product deleted.");
      startCreate();
      await loadProducts();
    } catch (deleteError) {
      setActionMessage(deleteError.message || "Unable to delete the product.");
    }
  };

  const availability = availabilityFromForm(form);

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Catalog</p>
          <h2>Add products, adjust pricing, and keep stock sellable.</h2>
        </div>

        <div className="admin-metrics-grid">
          <article className="summary-card">
            <p className="eyebrow">Products</p>
            <strong className="dashboard-metric">{metrics.total}</strong>
            <p className="section-copy">Total products in the catalog.</p>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Active</p>
            <strong className="dashboard-metric">{metrics.active}</strong>
            <p className="section-copy">Live on the storefront.</p>
          </article>
          <article className="summary-card">
            <p className="eyebrow">Unsellable</p>
            <strong className="dashboard-metric">{metrics.unsellable}</strong>
            <p className="section-copy">Active but stock below their minimum order — nobody can buy these.</p>
          </article>
        </div>
      </section>

      <section className="section-panel admin-dashboard-layout">
        <div className="admin-orders-column">
          <div className="delivery-form-card admin-filters-grid">
            <div className="input-field">
              <label className="field-label strong-label" htmlFor="product-status">
                Status
              </label>
              <select
                id="product-status"
                value={filters.status}
                onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
              >
                {["All", ...STATUS_OPTIONS].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-field">
              <label className="field-label strong-label" htmlFor="product-category">
                Category
              </label>
              <select
                id="product-category"
                value={filters.category}
                onChange={(e) => setFilters((c) => ({ ...c, category: e.target.value }))}
              >
                {["All", ...CATEGORY_OPTIONS].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-field full-span">
              <label className="field-label strong-label" htmlFor="product-search">
                Search
              </label>
              <input
                id="product-search"
                type="text"
                placeholder="Search by name, description, or category"
                value={filters.query}
                onChange={(e) => setFilters((c) => ({ ...c, query: e.target.value }))}
              />
            </div>
            <div className="input-field full-span">
              <button type="button" className="primary-button" onClick={startCreate}>
                + New product
              </button>
            </div>
          </div>

          <div className="orders-table-shell">
            {isLoading ? (
              <div className="summary-card">
                <p className="section-copy">Loading products...</p>
              </div>
            ) : products.length > 0 ? (
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={editingId === product.id ? "selected-row" : ""}
                      onClick={() => startEdit(product)}
                    >
                      <td>
                        <strong>{product.name}</strong>
                        <span>MOQ {getMinimumOrderQty(product)}</span>
                      </td>
                      <td>{product.category}</td>
                      <td>{formatMoney(product.price)}</td>
                      <td>
                        <StockCell product={product} />
                      </td>
                      <td>
                        <span className={`status-badge status-${product.status}`}>{product.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="summary-card">
                <p className="section-copy">No products match the current filters.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="checkout-column">
          <div className="summary-card">
            <p className="eyebrow">{editingId ? "Edit product" : "New product"}</p>

            <form className="admin-product-form" onSubmit={handleSubmit}>
              <InputField label="Name" htmlFor="f-name" error={fieldErrors.name}>
                <input id="f-name" type="text" value={form.name} onChange={setField("name")} />
              </InputField>

              <InputField label="Description" htmlFor="f-description" error={fieldErrors.description}>
                <textarea id="f-description" rows={3} value={form.description} onChange={setField("description")} />
              </InputField>

              <InputField label="Category" htmlFor="f-category" error={fieldErrors.category}>
                <select id="f-category" value={form.category} onChange={setField("category")}>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </InputField>

              <ProductImageUploader
                images={form.images}
                onChange={(images) => setForm((current) => ({ ...current, images }))}
                token={token}
                error={fieldErrors.images}
                storageDurable={storageDurable}
              />

              <div className="admin-filters-grid">
                <InputField label="Price (₹)" htmlFor="f-price" error={fieldErrors.price}>
                  <input id="f-price" type="number" min="0" step="1" value={form.price} onChange={setField("price")} />
                </InputField>
                <InputField label="MRP (₹)" htmlFor="f-mrp" error={fieldErrors.mrp} helperText="Blank = same as price.">
                  <input id="f-mrp" type="number" min="0" step="1" value={form.mrp} onChange={setField("mrp")} />
                </InputField>
              </div>

              <div className="admin-filters-grid">
                <InputField label="Stock" htmlFor="f-stock" error={fieldErrors.stock}>
                  <input id="f-stock" type="number" min="0" step="1" value={form.stock} onChange={setField("stock")} />
                </InputField>
                <InputField label="Min order qty" htmlFor="f-moq" error={fieldErrors.minimumOrderQty}>
                  <input id="f-moq" type="number" min="1" step="1" value={form.minimumOrderQty} onChange={setField("minimumOrderQty")} />
                </InputField>
              </div>

              {/* The whole reason this page exists: never let stock sit below the
                  minimum order silently again. */}
              {availability ? (
                <p className={`availability-note availability-${availability.tone}`} role="status">
                  {availability.label}
                </p>
              ) : null}

              <div className="admin-filters-grid">
                <InputField label="Lead time" htmlFor="f-lead" helperText="e.g. Ready in 3-5 days">
                  <input id="f-lead" type="text" value={form.leadTime} onChange={setField("leadTime")} />
                </InputField>
                <InputField label="SKU" htmlFor="f-sku">
                  <input id="f-sku" type="text" value={form.sku} onChange={setField("sku")} />
                </InputField>
              </div>

              <InputField label="Badge" htmlFor="f-badge" helperText="Optional pill, e.g. Best Seller">
                <input id="f-badge" type="text" value={form.badge} onChange={setField("badge")} />
              </InputField>

              <InputField label="Materials" htmlFor="f-materials" helperText="Comma-separated finishes or options.">
                <input id="f-materials" type="text" value={form.materials} onChange={setField("materials")} />
              </InputField>

              <InputField label="Audience" htmlFor="f-audience">
                <input id="f-audience" type="text" value={form.audience} onChange={setField("audience")} />
              </InputField>

              <div className="admin-filters-grid">
                <InputField label="Status" htmlFor="f-status" error={fieldErrors.status}>
                  <select id="f-status" value={form.status} onChange={setField("status")}>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </InputField>
                <div className="input-field">
                  <label className="field-label strong-label" htmlFor="f-featured">
                    Featured
                  </label>
                  <label className="checkbox-row">
                    <input id="f-featured" type="checkbox" checked={form.featured} onChange={setField("featured")} />
                    <span>Show in featured rails</span>
                  </label>
                </div>
              </div>

              <div className="action-row">
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingId ? "Save changes" : "Create product"}
                </button>
                {editingId ? (
                  <button type="button" className="secondary-button danger-button" onClick={handleDelete}>
                    Delete
                  </button>
                ) : null}
              </div>

              {actionMessage ? <p className="submit-message">{actionMessage}</p> : null}
            </form>
          </div>

          {error ? (
            <div className="summary-card">
              <p className="field-error">{error}</p>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

export default AdminProductsPage;
