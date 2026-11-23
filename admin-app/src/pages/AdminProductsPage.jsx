import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import NewHsnCodePanel from "../components/NewHsnCodePanel";
import NewCollectionPanel from "../components/NewCollectionPanel";
import CollectionDetailsPanel from "../components/CollectionDetailsPanel";
import { STOREFRONT_URL } from "../lib/adminAppUrls";
// The one source of truth for "buyable", shared with the storefront and the
// server (src/utils/productAvailability.js). Using it here means the admin sees
// exactly the availability the customer will.
import {
  getMinimumOrderQty,
  isProductLowStock,
  isProductOutOfStock,
} from "../../../src/utils/productAvailability";
// Same rules the server enforces on save, so problems show while typing.
import { MAX_PRICE_TIERS, validatePriceTiers } from "../../../src/utils/tierPricing";
import { fetchAdminCollections, fetchHsnCodes, makeProductCollection } from "../lib/adminApi";
import { CATEGORY_OPTIONS } from "../lib/catalogCategories";
import { rowKeyHandler, useStackedReveal } from "../lib/useStackedReveal";

const productCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const formatMoney = (value) => productCurrency.format(value || 0);

// Dropdown entry that opens the "new code" panel. Not a valid HSN code (codes
// are digits only), so it can never collide with a real one.
const NEW_HSN_OPTION = "__new__";
// Same idea for the Collection dropdown (collection ids are UUIDs).
const NEW_COLLECTION_OPTION = "__new_collection__";

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
  // Volume pricing rows: { minQty, price } as typed text.
  priceTiers: [],
  // HSN/SAC code from the HSN & GST rates list; the GST rate comes from there.
  hsnCode: "",
  // Collection this product is a design in (e.g. Wedding Invitation Suite),
  // and its type there ("Royal") for the collection page's filters.
  collectionId: "",
  designType: "",
  leadTime: "",
  sku: "",
  badge: "",
  materials: "",
  // Admin-defined selectable options (e.g. Paper type, Size). Each row's values
  // are edited as comma-separated text, mirroring `materials`.
  options: [],
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
  priceTiers: (product.priceTiers || []).map((tier) => ({ minQty: String(tier.minQty), price: String(tier.price) })),
  hsnCode: product.hsnCode || "",
  collectionId: product.collectionId || "",
  designType: product.designType || "",
  leadTime: product.leadTime || "",
  sku: product.sku || "",
  badge: product.badge || "",
  materials: (product.materials || []).join(", "),
  options: (product.options || []).map((option) => ({
    label: option.label || "",
    values: (option.values || []).join(", "),
  })),
  audience: product.audience || "",
  status: product.status || "draft",
  featured: Boolean(product.featured),
});

const splitList = (value) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

// A new design started from a collection ("+ Add a design"): already in the
// collection, listed under its category, and set to go live on save, since
// the owner is adding it to the shop on purpose. Status can still be changed.
//
// With a template (the newest design already in the collection) the settings
// designs share are copied too, so the fiftieth wedding card only needs its
// own name and photos: description, HSN code, price/MRP and bulk prices (kept
// together so they stay consistent), stock, MOQ, lead time, materials,
// options and audience. Name, photos, SKU, badge and design type start empty.
export const buildNewDesignForm = (collection, template = null) => {
  const base = {
    ...EMPTY_FORM,
    collectionId: collection.id,
    category: CATEGORY_OPTIONS.includes(collection.category) ? collection.category : EMPTY_FORM.category,
    status: "active",
  };
  if (!template) return base;
  const copied = toForm(template);
  return {
    ...base,
    description: copied.description,
    hsnCode: copied.hsnCode,
    price: copied.price,
    mrp: copied.mrp,
    priceTiers: copied.priceTiers,
    stock: copied.stock,
    minimumOrderQty: copied.minimumOrderQty,
    leadTime: copied.leadTime,
    materials: copied.materials,
    options: copied.options,
    audience: copied.audience,
  };
};

// The design a new one starts from: the most recently added in the collection.
export const pickDesignTemplate = (designs) =>
  [...(designs || [])].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] ||
  null;

// What the owner needs to hear after saving a design: whether it is actually
// on the shop inside its collection.
export const savedMessage = ({ wasEditing, product, collection }) => {
  const base = wasEditing ? "Product updated." : "Product created.";
  if (!collection) return base;
  if (product.status !== "active") {
    return `${base} It's a ${product.status}, so it won't show in “${collection.name}” on the shop until you set Status to active.`;
  }
  if (collection.status !== "active") {
    return `${base} It's in “${collection.name}”, but that collection is a draft, so customers can't see it yet.`;
  }
  return `${base} It's live in “${collection.name}”.`;
};

// Everything carries over; it starts as a draft so a half-edited copy never
// goes on sale, and "(copy)" makes it obvious in the list until renamed.
export const buildDuplicatePayload = (form) => ({
  ...toPayload(form),
  name: `${form.name.trim()} (copy)`,
  status: "draft",
  featured: false,
});

const toPayload = (form) => ({
  name: form.name.trim(),
  description: form.description.trim(),
  category: form.category,
  images: form.images,
  price: Number(form.price),
  mrp: form.mrp === "" ? Number(form.price) : Number(form.mrp),
  stock: Number(form.stock || 0),
  minimumOrderQty: Number(form.minimumOrderQty || 1),
  priceTiers: form.priceTiers
    .filter((tier) => String(tier.minQty).trim() !== "" || String(tier.price).trim() !== "")
    .map((tier) => ({ minQty: Number(tier.minQty), price: Number(tier.price) })),
  hsnCode: form.hsnCode,
  collectionId: form.collectionId,
  designType: form.designType.trim(),
  leadTime: form.leadTime.trim(),
  sku: form.sku.trim(),
  badge: form.badge.trim(),
  materials: splitList(form.materials),
  options: form.options
    .map((option) => ({ label: option.label.trim(), values: splitList(option.values) }))
    .filter((option) => option.label),
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ query: "", status: "All", category: "All", collection: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Asked up front rather than discovered by a failed upload: without
  // Cloudinary in production the server refuses photos, and an admin should
  // learn that from a banner, not from a 503 after picking a file.
  const [storageDurable, setStorageDurable] = useState(true);

  const [editingId, setEditingId] = useState(null); // null = creating
  const { panelRef, listRef, revealPanel, revealList } = useStackedReveal();
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
        collection: filters.collection,
        limit: 100,
      });
      setProducts(response.items);
    } catch (loadError) {
      setError(loadError.message || "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [filters.category, filters.collection, filters.query, filters.status, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // HSN codes for the picker and the list's GST column.
  const [hsnCodes, setHsnCodes] = useState([]);
  useEffect(() => {
    fetchHsnCodes(token)
      .then((data) => setHsnCodes(data.hsnCodes || []))
      .catch(() => setHsnCodes([]));
  }, [token]);
  const hsnByCode = useMemo(() => new Map(hsnCodes.map((row) => [row.code, row])), [hsnCodes]);
  const productHsnOptions = hsnCodes.filter((row) => row.appliesTo === "product");

  // Collections for the product's "Collection" field and the list filter.
  const [collections, setCollections] = useState([]);
  useEffect(() => {
    fetchAdminCollections(token)
      .then((data) => setCollections(data.collections || []))
      .catch(() => setCollections([]));
  }, [token]);
  const collectionNameById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection.name])),
    [collections],
  );
  const [isAddingHsn, setIsAddingHsn] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [isMakingCollection, setIsMakingCollection] = useState(false);

  // The collection the form currently points at, for "Edit collection details".
  const selectedCollection = collections.find((collection) => collection.id === form.collectionId) || null;
  // Whether the product, as saved, is outside any collection: only then can it
  // become one (the server works from the saved product).
  const savedProduct = editingId ? products.find((product) => product.id === editingId) : null;
  const canMakeCollection = Boolean(savedProduct && !savedProduct.collectionId && !form.collectionId);

  const handleCollectionDetailsSaved = (row) => {
    setCollections((current) =>
      current.map((existing) => (existing.id === row.id ? { ...existing, ...row } : existing)),
    );
    setIsEditingCollection(false);
    setActionMessage(`Collection “${row.name}” updated.`);
  };

  // Turns the product being edited into a collection with the same name,
  // photo and category, keeping it inside as the first design.
  const handleMakeCollection = async () => {
    if (!editingId) return;
    setIsMakingCollection(true);
    setActionMessage("");
    try {
      const data = await makeProductCollection(editingId, token);
      setCollections((current) => [...current, data.collection].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((current) => ({ ...current, collectionId: data.collection.id }));
      await loadProducts();
      setActionMessage(
        `“${data.collection.name}” is now a collection, with this product as its first design. Add more designs with Duplicate, or pick this collection on new products.`,
      );
    } catch (makeError) {
      setActionMessage(makeError.message || "Unable to make this product a collection.");
    } finally {
      setIsMakingCollection(false);
    }
  };

  // A collection created from the product form joins the list (and the list
  // filter) and this product is put in it.
  const handleCollectionCreated = (row) => {
    setCollections((current) =>
      current.some((existing) => existing.id === row.id)
        ? current
        : [...current, row].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setForm((current) => ({ ...current, collectionId: row.id }));
    setFieldErrors((current) => ({ ...current, collectionId: undefined }));
    setIsAddingCollection(false);
  };

  // A code added from the product form joins the shared list (so every other
  // product can pick it too) and is selected for this one.
  const handleHsnCreated = (row) => {
    setHsnCodes((current) =>
      current.some((existing) => existing.code === row.code)
        ? current
        : [...current, row].sort((a, b) => a.code.localeCompare(b.code)),
    );
    setForm((current) => ({ ...current, hsnCode: row.code }));
    setFieldErrors((current) => ({ ...current, hsnCode: undefined }));
    setIsAddingHsn(false);
  };

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
    setIsAddingHsn(false);
    setIsAddingCollection(false);
    setIsEditingCollection(false);
    revealPanel();
  };

  const startAddDesign = async (collection) => {
    // Start from the newest design already in the collection, when there is one.
    let template = null;
    try {
      const data = await fetchAdminProducts(token, { collection: collection.id, limit: 100 });
      template = pickDesignTemplate(data.items);
    } catch {
      template = null;
    }
    setEditingId(null);
    setForm(buildNewDesignForm(collection, template));
    setFieldErrors({});
    setActionMessage(
      template
        ? `New design for “${collection.name}”, starting from “${template.name}”: HSN, price, stock, MOQ and options are copied. Add its name and photos, check the price, then Create product.`
        : `New design for “${collection.name}”. Add its name, photos and price, then Create product.`,
    );
    setIsAddingHsn(false);
    setIsAddingCollection(false);
    setIsEditingCollection(false);
    revealPanel();
  };

  // Links from the Collections page: ?addTo=<collection id> starts a new
  // design in it, ?edit=<product id> opens that product. Handled once the
  // data they need has loaded, then dropped from the address.
  const addTo = searchParams.get("addTo");
  const editParam = searchParams.get("edit");
  useEffect(() => {
    if (!addTo) return;
    const collection = collections.find((row) => row.id === addTo);
    if (!collection) return;
    startAddDesign(collection);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTo, collections]);
  useEffect(() => {
    if (!editParam || isLoading) return;
    const product = products.find((row) => row.id === editParam);
    if (product) startEdit(product);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, isLoading, products]);

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm(toForm(product));
    setFieldErrors({});
    setActionMessage("");
    setIsAddingHsn(false);
    setIsAddingCollection(false);
    setIsEditingCollection(false);
    revealPanel();
  };

  const setField = (key) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  // Options repeater — each row is { label, values } where values is edited as
  // comma-separated text (split into an array in toPayload).
  const addOption = () =>
    setForm((current) => ({ ...current, options: [...current.options, { label: "", values: "" }] }));

  const setOptionField = (index, key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({
      ...current,
      options: current.options.map((option, i) => (i === index ? { ...option, [key]: value } : option)),
    }));
  };

  const removeOption = (index) =>
    setForm((current) => ({ ...current, options: current.options.filter((_, i) => i !== index) }));

  // Bulk pricing repeater — each row is { minQty, price } as typed text.
  const addPriceTier = () =>
    setForm((current) => ({ ...current, priceTiers: [...current.priceTiers, { minQty: "", price: "" }] }));

  const setPriceTierField = (index, key) => (event) => {
    const { value } = event.target;
    setForm((current) => ({
      ...current,
      priceTiers: current.priceTiers.map((tier, i) => (i === index ? { ...tier, [key]: value } : tier)),
    }));
  };

  const removePriceTier = (index) =>
    setForm((current) => ({ ...current, priceTiers: current.priceTiers.filter((_, i) => i !== index) }));

  const priceTierErrors = useMemo(
    () =>
      validatePriceTiers(toPayload(form).priceTiers, {
        price: Number(form.price),
        minimumOrderQty: Number(form.minimumOrderQty || 1),
      }).errors,
    [form],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    // The bulk pricing errors are already on screen; the server would refuse
    // the save for the same reasons.
    if (priceTierErrors.length > 0) {
      setFieldErrors({ priceTiers: priceTierErrors.join(" ") });
      return;
    }
    setIsSaving(true);
    setFieldErrors({});
    setActionMessage("");

    const payload = toPayload(form);

    try {
      const response = editingId
        ? await updateProduct(editingId, payload, token)
        : await createProduct(payload, token);

      const saved = response.product;
      setActionMessage(
        savedMessage({
          wasEditing: Boolean(editingId),
          product: saved,
          collection: collections.find((row) => row.id === saved.collectionId) || null,
        }),
      );
      await loadProducts();

      // Stay on the freshly saved product so the admin can keep tuning stock.
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

  // Adding many similar designs (e.g. 50 wedding cards) is mostly the same
  // price, MOQ, HSN and collection each time. Duplicate copies the product as
  // a draft "(copy)" and opens it, so only the name, photos and price change.
  const handleDuplicate = async () => {
    if (!editingId) return;
    setIsSaving(true);
    setFieldErrors({});
    setActionMessage("");
    try {
      const response = await createProduct(buildDuplicatePayload(form), token);
      await loadProducts();
      setEditingId(response.product.id);
      setForm(toForm(response.product));
      setActionMessage("Copy created as a draft. Change its name, photos and price, then set it to active.");
      revealPanel();
    } catch (duplicateError) {
      setActionMessage(duplicateError.message || "Unable to duplicate the product.");
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

  // Types already used in the chosen collection, offered as suggestions so the
  // same type isn't spelled three different ways across fifty designs.
  const designTypeSuggestions = [
    ...new Set(
      products
        .filter((product) => form.collectionId && product.collectionId === form.collectionId)
        .map((product) => product.designType)
        .filter(Boolean),
    ),
  ].sort();

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
        <div className="admin-orders-column" ref={listRef} tabIndex={-1}>
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
            <div className="input-field">
              <label className="field-label strong-label" htmlFor="product-collection">
                Collection
              </label>
              <select
                id="product-collection"
                value={filters.collection}
                onChange={(e) => setFilters((c) => ({ ...c, collection: e.target.value }))}
              >
                <option value="">All</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
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
            ) : error ? (
              <div className="summary-card" role="alert">
                <p className="field-error">Couldn&rsquo;t load the products: {error}</p>
                <div className="action-row">
                  <button type="button" className="secondary-button" onClick={loadProducts}>
                    Try again
                  </button>
                </div>
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
                    <th>GST</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className={editingId === product.id ? "selected-row" : ""}
                      tabIndex={0}
                      onClick={() => startEdit(product)}
                      onKeyDown={rowKeyHandler(() => startEdit(product))}
                    >
                      <td>
                        <strong>{product.name}</strong>
                        {collectionNameById.get(product.collectionId) ? (
                          <span>Design in {collectionNameById.get(product.collectionId)}</span>
                        ) : null}
                        <span>MOQ {getMinimumOrderQty(product)}</span>
                      </td>
                      <td data-label="Category">{product.category}</td>
                      <td data-label="Price">{formatMoney(product.price)}</td>
                      <td data-label="Stock">
                        <StockCell product={product} />
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge status-${product.status}`}>{product.status}</span>
                      </td>
                      <td data-label="GST">
                        {!product.hsnCode ? (
                          <span className="status-badge status-draft">No HSN</span>
                        ) : hsnByCode.get(product.hsnCode)?.confirmed ? (
                          <span>
                            {product.hsnCode} · {hsnByCode.get(product.hsnCode).rate}%
                          </span>
                        ) : (
                          <span className="status-badge status-draft">{product.hsnCode} unconfirmed</span>
                        )}
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

        <aside className="checkout-column" ref={panelRef} tabIndex={-1}>
          <div className="summary-card">
            <div className="admin-panel-head">
              <p className="eyebrow">{editingId ? "Edit product" : "New product"}</p>
              <button type="button" className="ghost-button admin-back-to-list" onClick={revealList}>
                Back to list
              </button>
            </div>

            <form className="admin-product-form" onSubmit={handleSubmit}>
              <InputField label="Name" htmlFor="f-name" error={fieldErrors.name}>
                <input id="f-name" type="text" value={form.name} onChange={setField("name")} />
              </InputField>

              <InputField label="Description" htmlFor="f-description" error={fieldErrors.description}>
                <textarea id="f-description" rows={3} value={form.description} onChange={setField("description")} />
              </InputField>

              <InputField
                label="HSN / SAC code"
                htmlFor="f-hsn"
                error={fieldErrors.hsnCode}
                helperText="Sets this product's GST rate. Not in the list? Choose “+ Add a new code…”. It’s saved for every product."
              >
                <select
                  id="f-hsn"
                  value={form.hsnCode}
                  onChange={(event) => {
                    // The "add" entry opens the panel; it never becomes the value.
                    if (event.target.value === NEW_HSN_OPTION) {
                      setIsAddingHsn(true);
                      return;
                    }
                    setField("hsnCode")(event);
                  }}
                >
                  <option value="">Not set</option>
                  {productHsnOptions.map((row) => (
                    <option key={row.code} value={row.code}>
                      {row.kind} {row.code} · {row.rate}%{row.confirmed ? "" : " (needs confirming)"} · {row.description}
                    </option>
                  ))}
                  <option value={NEW_HSN_OPTION}>+ Add a new code…</option>
                </select>
              </InputField>
              {isAddingHsn ? (
                <NewHsnCodePanel
                  token={token}
                  existingCodes={hsnCodes}
                  onCreated={handleHsnCreated}
                  onCancel={() => setIsAddingHsn(false)}
                />
              ) : null}

              <InputField label="Category" htmlFor="f-category" error={fieldErrors.category}>
                <select id="f-category" value={form.category} onChange={setField("category")}>
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </InputField>

              <div className="admin-filters-grid">
                <InputField
                  label="Collection"
                  htmlFor="f-collection"
                  error={fieldErrors.collectionId}
                  helperText={
                    collections.length === 0
                      ? "No collections yet. Choose “+ New collection…” to create one (e.g. Wedding Invitation Suite) and put this product in it."
                      : "Put this product inside a collection, e.g. one design in Wedding Invitation Suite. Not listed? Choose “+ New collection…”."
                  }
                >
                  <select
                    id="f-collection"
                    value={form.collectionId}
                    onChange={(event) => {
                      // The "new" entry opens the panel; it never becomes the value.
                      if (event.target.value === NEW_COLLECTION_OPTION) {
                        setIsAddingCollection(true);
                        return;
                      }
                      setField("collectionId")(event);
                    }}
                  >
                    <option value="">None (standalone product)</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                        {collection.status === "draft" ? " (draft)" : ""}
                      </option>
                    ))}
                    <option value={NEW_COLLECTION_OPTION}>+ New collection…</option>
                  </select>
                </InputField>
                {form.collectionId ? (
                  <InputField
                    label="Design type"
                    htmlFor="f-design-type"
                    error={fieldErrors.designType}
                    helperText="Groups designs on the collection page, e.g. Royal, Floral, Laser-cut."
                  >
                    <input
                      id="f-design-type"
                      type="text"
                      list="f-design-type-options"
                      value={form.designType}
                      onChange={setField("designType")}
                    />
                    <datalist id="f-design-type-options">
                      {designTypeSuggestions.map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                  </InputField>
                ) : null}
              </div>
              {isAddingCollection ? (
                <NewCollectionPanel
                  token={token}
                  existingCollections={collections}
                  defaultCategory={form.category}
                  defaultCover={form.images[0] || ""}
                  onCreated={handleCollectionCreated}
                  onCancel={() => setIsAddingCollection(false)}
                />
              ) : null}

              {canMakeCollection && !isAddingCollection ? (
                <div className="collection-actions">
                  <p className="section-copy">
                    Want this product to hold its own designs (e.g. many wedding cards)? Make it a collection: it
                    gets this product&rsquo;s name, photo and category, and keeps this product inside as its first
                    design.
                  </p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleMakeCollection}
                    disabled={isMakingCollection}
                  >
                    {isMakingCollection ? "Making it a collection…" : "Make this product a collection"}
                  </button>
                </div>
              ) : null}

              {selectedCollection && !isEditingCollection ? (
                <div className="collection-actions">
                  {editingId ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => startAddDesign(selectedCollection)}
                    >
                      + Add another design to {selectedCollection.name}
                    </button>
                  ) : null}
                  <button type="button" className="secondary-button" onClick={() => setIsEditingCollection(true)}>
                    Edit collection details
                  </button>
                  {selectedCollection.status === "active" ? (
                    <a
                      className="ghost-button"
                      href={`${STOREFRONT_URL}/collections/${selectedCollection.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View collection on the shop ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
              {selectedCollection && isEditingCollection ? (
                <CollectionDetailsPanel
                  key={selectedCollection.id}
                  token={token}
                  collection={selectedCollection}
                  onSaved={handleCollectionDetailsSaved}
                  onCancel={() => setIsEditingCollection(false)}
                />
              ) : null}

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

              {/* Volume pricing: cheaper per unit from a quantity up. Checked live with
                  the same rules the server applies on save. */}
              <div className="input-field">
                <span className="field-label strong-label">Bulk pricing</span>
                <p className="section-copy" style={{ margin: "0 0 0.5rem" }}>
                  Lower unit prices for larger orders, e.g. 250+ at ₹16 each. The base price above applies from the
                  minimum order up to the first row. Up to {MAX_PRICE_TIERS} rows.
                </p>
                {form.priceTiers.length > 0 ? (
                  <div className="page-stack" style={{ gap: "0.75rem" }}>
                    {form.priceTiers.map((tier, index) => (
                      <div key={index} className="admin-filters-grid" style={{ alignItems: "end" }}>
                        <InputField label="From quantity" htmlFor={`f-tier-qty-${index}`}>
                          <input
                            id={`f-tier-qty-${index}`}
                            type="number"
                            min="1"
                            step="1"
                            placeholder="e.g. 250"
                            value={tier.minQty}
                            onChange={setPriceTierField(index, "minQty")}
                          />
                        </InputField>
                        <InputField label="Price per unit (₹)" htmlFor={`f-tier-price-${index}`}>
                          <input
                            id={`f-tier-price-${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="e.g. 16"
                            value={tier.price}
                            onChange={setPriceTierField(index, "price")}
                          />
                        </InputField>
                        <button type="button" className="secondary-button danger-button" onClick={() => removePriceTier(index)}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {priceTierErrors.length > 0 || fieldErrors.priceTiers ? (
                  <div className="field-error" role="alert">
                    {(priceTierErrors.length > 0 ? priceTierErrors : [fieldErrors.priceTiers]).map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                ) : null}
                {form.priceTiers.length < MAX_PRICE_TIERS ? (
                  <div className="action-row" style={{ marginTop: "0.5rem" }}>
                    <button type="button" className="secondary-button" onClick={addPriceTier}>
                      + Add bulk price
                    </button>
                  </div>
                ) : null}
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

              {/* Admin-defined selectable options (e.g. Paper type, Size). Customers
                  pick these on the institutional bulk-quote form. Spec only — they
                  never change price. */}
              <div className="input-field">
                <span className="field-label strong-label">Options</span>
                <p className="section-copy" style={{ margin: "0 0 0.5rem" }}>
                  Selectable choices shown on the bulk-quote form — e.g. Paper type, Size. Values are comma-separated.
                </p>
                {form.options.length > 0 ? (
                  <div className="page-stack" style={{ gap: "0.75rem" }}>
                    {form.options.map((option, index) => (
                      <div key={index} className="admin-filters-grid" style={{ alignItems: "end" }}>
                        <InputField label="Label" htmlFor={`f-option-label-${index}`}>
                          <input
                            id={`f-option-label-${index}`}
                            type="text"
                            placeholder="e.g. Paper type"
                            value={option.label}
                            onChange={setOptionField(index, "label")}
                          />
                        </InputField>
                        <InputField label="Values" htmlFor={`f-option-values-${index}`} helperText="Comma-separated">
                          <input
                            id={`f-option-values-${index}`}
                            type="text"
                            placeholder="e.g. 70gsm, 80gsm, 90gsm"
                            value={option.values}
                            onChange={setOptionField(index, "values")}
                          />
                        </InputField>
                        <button
                          type="button"
                          className="secondary-button danger-button"
                          onClick={() => removeOption(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="action-row" style={{ marginTop: "0.5rem" }}>
                  <button type="button" className="secondary-button" onClick={addOption}>
                    + Add option
                  </button>
                </div>
              </div>

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

              {selectedCollection && form.status !== "active" ? (
                <p className="availability-note availability-warn" role="note">
                  Status is {form.status}: this design won&rsquo;t show in &ldquo;{selectedCollection.name}&rdquo; on
                  the shop until Status is active.
                </p>
              ) : null}

              <div className="action-row">
                <button type="submit" className="primary-button" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingId ? "Save changes" : "Create product"}
                </button>
                {editingId ? (
                  <button type="button" className="secondary-button" onClick={handleDuplicate} disabled={isSaving}>
                    Duplicate
                  </button>
                ) : null}
                {editingId ? (
                  <button type="button" className="secondary-button danger-button" onClick={handleDelete}>
                    Delete
                  </button>
                ) : null}
              </div>

              {actionMessage ? <p className="submit-message">{actionMessage}</p> : null}
            </form>
          </div>

        </aside>
      </section>
    </main>
  );
}

export default AdminProductsPage;
