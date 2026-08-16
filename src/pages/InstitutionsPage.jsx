import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck, ClipboardList, Clock, CheckCircle2 } from "lucide-react";
import ProductCard from "../components/ProductCard";
import InputField from "../components/InputField";
import { useProducts } from "../hooks/useProducts";
import { createEnquiry } from "../api/enquiriesApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sample upload mirrors the order-artwork channel: PDFs (last year's paper) plus
// images, capped at 10MB to match the server's ARTWORK_TYPES / maxBytes.
const SAMPLE_ACCEPT = "application/pdf,image/png,image/jpeg,image/jpg";
const SAMPLE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const SAMPLE_MAX_BYTES = 10 * 1024 * 1024;

/** Public bulk-quote request form for institutions that procure via quote/PO. */
function BulkQuoteForm({ products = [] }) {
  const [form, setForm] = useState({
    institutionName: "",
    institutionType: "school",
    contactName: "",
    email: "",
    phone: "",
    requirements: "",
    message: "",
  });
  // Optional structured line items — each is { productId, quantity, options },
  // where options maps an option label to the picked value. Additive to the
  // free-text requirements, which stays the catch-all.
  const [items, setItems] = useState([]);
  const [sampleFile, setSampleFile] = useState(null);
  const [sampleError, setSampleError] = useState("");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const productById = (id) => products.find((product) => product.id === id);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const addItem = () => setItems((current) => [...current, { productId: "", quantity: "", options: {} }]);

  const removeItem = (index) => setItems((current) => current.filter((_, i) => i !== index));

  const setItemProduct = (index) => (event) => {
    const productId = event.target.value;
    const product = productById(productId);
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? { productId, quantity: product?.minimumOrderQty ? String(product.minimumOrderQty) : "", options: {} }
          : item,
      ),
    );
  };

  const setItemQuantity = (index) => (event) => {
    const { value } = event.target;
    setItems((current) => current.map((item, i) => (i === index ? { ...item, quantity: value } : item)));
  };

  const setItemOption = (index, label) => (event) => {
    const { value } = event.target;
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, options: { ...item.options, [label]: value } } : item)),
    );
  };

  const onSampleChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSubmitError("");
    if (!file) {
      setSampleFile(null);
      setSampleError("");
      return;
    }
    if (!SAMPLE_TYPES.includes(file.type)) {
      setSampleFile(null);
      setSampleError("Sample must be a PDF, PNG, or JPG.");
      return;
    }
    if (file.size > SAMPLE_MAX_BYTES) {
      setSampleFile(null);
      setSampleError("Sample must be 10MB or smaller.");
      return;
    }
    setSampleError("");
    setSampleFile(file);
  };

  const validate = () => {
    const next = {};
    if (!form.institutionName.trim()) next.institutionName = "Institution name is required.";
    if (!form.contactName.trim()) next.contactName = "Contact name is required.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email.";
    if (!form.requirements.trim()) next.requirements = "Tell us the items and quantities you need.";
    return next;
  };

  // Turn the item rows into the server's shape, dropping rows without a product
  // and options the buyer left unpicked.
  const buildStructuredItems = () =>
    items
      .filter((item) => item.productId)
      .map((item) => {
        const product = productById(item.productId);
        const options = (product?.options || [])
          .map((option) => ({ label: option.label, value: item.options[option.label] || "" }))
          .filter((option) => option.value);
        return {
          productId: item.productId,
          productName: product?.name || item.productId,
          options,
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        };
      });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (sampleError) return;

    setIsSubmitting(true);
    setSubmitError("");

    const structuredItems = buildStructuredItems();

    // Only reach for multipart when there's a file to send; otherwise a plain
    // JSON object keeps the common path simple (and unchanged for text-only
    // submissions).
    let payload;
    if (sampleFile) {
      payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append("items", JSON.stringify(structuredItems));
      payload.append("sampleFile", sampleFile);
    } else {
      payload = { ...form, items: structuredItems };
    }

    try {
      await createEnquiry(payload);
      setDone(true);
    } catch (error) {
      setErrors(error?.payload?.errors || {});
      setSubmitError(error?.message || "Couldn't send your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="empty-state-card" role="status">
        <span style={{ color: "var(--success)" }} aria-hidden="true">
          <CheckCircle2 size={28} />
        </span>
        <h3>Request received.</h3>
        <p className="section-copy">
          Thanks — we&rsquo;ve got your requirements and will be in touch shortly with a quote and a
          production plan.
        </p>
      </div>
    );
  }

  return (
    <form className="quote-form" onSubmit={handleSubmit} noValidate>
      <div className="quote-form-grid">
        <InputField label="Institution name" htmlFor="q-institution" error={errors.institutionName}>
          <input id="q-institution" value={form.institutionName} onChange={set("institutionName")} placeholder="e.g. St. Xavier's College" />
        </InputField>
        <label className="input-field">
          <span className="field-label strong-label">Institution type</span>
          <select value={form.institutionType} onChange={set("institutionType")}>
            <option value="school">School</option>
            <option value="college">College</option>
            <option value="university">University</option>
            <option value="other">Other</option>
          </select>
        </label>
        <InputField label="Contact name" htmlFor="q-contact" error={errors.contactName}>
          <input id="q-contact" value={form.contactName} onChange={set("contactName")} placeholder="Your name" />
        </InputField>
        <InputField label="Email" htmlFor="q-email" error={errors.email}>
          <input id="q-email" type="email" value={form.email} onChange={set("email")} placeholder="you@institution.edu" />
        </InputField>
        <InputField label="Phone (optional)" htmlFor="q-phone">
          <input id="q-phone" value={form.phone} onChange={set("phone")} placeholder="Phone number" />
        </InputField>
      </div>

      <InputField label="What do you need?" htmlFor="q-requirements" error={errors.requirements} helperText="List items and quantities — e.g. 5000 answer booklets, 20 attendance registers.">
        <textarea id="q-requirements" rows={3} value={form.requirements} onChange={set("requirements")} placeholder="Items and quantities" />
      </InputField>

      {/* Optional structured items — pick a product and its admin-defined
          options (paper type, size). Additive to the free-text field above. */}
      {products.length > 0 ? (
        <div className="input-field">
          <span className="field-label strong-label">Configure specific items (optional)</span>
          <p className="section-copy" style={{ margin: "0 0 0.5rem" }}>
            Choose a product and its paper type, size, and quantity so we can quote precisely.
          </p>

          {items.map((item, index) => {
            const product = productById(item.productId);
            return (
              <div
                key={index}
                className="delivery-form-card"
                style={{ marginBottom: "0.75rem", display: "grid", gap: "0.75rem" }}
              >
                <div className="quote-form-grid">
                  <label className="input-field">
                    <span className="field-label strong-label">Product</span>
                    <select value={item.productId} onChange={setItemProduct(index)} aria-label={`Item ${index + 1} product`}>
                      <option value="">Select a product…</option>
                      {products.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="input-field">
                    <span className="field-label strong-label">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={setItemQuantity(index)}
                      placeholder={product?.minimumOrderQty ? `MOQ ${product.minimumOrderQty}` : "Quantity"}
                      aria-label={`Item ${index + 1} quantity`}
                    />
                  </label>
                </div>

                {(product?.options || []).length > 0 ? (
                  <div className="quote-form-grid">
                    {product.options.map((option) => (
                      <label className="input-field" key={option.label}>
                        <span className="field-label strong-label">{option.label}</span>
                        <select
                          value={item.options[option.label] || ""}
                          onChange={setItemOption(index, option.label)}
                          aria-label={`Item ${index + 1} ${option.label}`}
                        >
                          <option value="">Select {option.label.toLowerCase()}…</option>
                          {(option.values || []).map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="action-row">
                  <button type="button" className="secondary-button danger-button" onClick={() => removeItem(index)}>
                    Remove item
                  </button>
                </div>
              </div>
            );
          })}

          <div className="action-row">
            <button type="button" className="secondary-button" onClick={addItem}>
              + Add item
            </button>
          </div>
        </div>
      ) : null}

      {/* Optional sample the institution already has (e.g. last year's paper). */}
      <InputField
        label="Attach a sample (optional)"
        htmlFor="q-sample"
        error={sampleError}
        helperText="PDF, PNG, or JPG up to 10MB — a reference of the item you want printed."
      >
        <input id="q-sample" type="file" accept={SAMPLE_ACCEPT} onChange={onSampleChange} />
      </InputField>
      {sampleFile ? (
        <p className="section-copy" style={{ marginTop: "-0.25rem" }}>
          Attached: <strong>{sampleFile.name}</strong>
        </p>
      ) : null}

      <InputField label="Anything else? (optional)" htmlFor="q-message">
        <textarea id="q-message" rows={2} value={form.message} onChange={set("message")} placeholder="Delivery timeline, custom formats, PO details…" />
      </InputField>

      {submitError ? (
        <p className="field-error" role="alert">
          {submitError}
        </p>
      ) : null}

      <button type="submit" className="primary-button" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Request a quote"}
      </button>
    </form>
  );
}

const INSTITUTIONAL_CATEGORY = "Institutional Supplies";
const CATEGORY_HREF = `/products?category=${encodeURIComponent(INSTITUTIONAL_CATEGORY)}`;

const valueProps = [
  { icon: ShieldCheck, title: "Secure exam printing", detail: "Confidential question papers and answer booklets with sealed handling." },
  { icon: ClipboardList, title: "Institutional formats", detail: "Attendance, general, and service registers printed to your ruling and binding." },
  { icon: FileText, title: "Bulk pricing", detail: "Volume rates for schools, colleges, and universities — request a quote for large runs." },
  { icon: Clock, title: "Reliable turnaround", detail: "Planned production windows that fit academic and exam calendars." },
];

/**
 * Public landing page for institutional buyers (schools, universities,
 * colleges). Reuses the storefront's own primitives (page-stack, section-panel,
 * product grid) and the live "Institutional Supplies" catalog, so it stays on
 * theme and add-to-cart works exactly like the rest of the store. The bulk
 * quote/enquiry form is added in the next increment at the #quote anchor.
 */
function InstitutionsPage() {
  const { data, isLoading, refetch, isFetching } = useProducts({ category: INSTITUTIONAL_CATEGORY, limit: 100 });
  const products = data?.items ?? [];
  const hasAnswer = Boolean(data);
  const couldNotLoad = !isLoading && !hasAnswer;
  const answeredButEmpty = !isLoading && hasAnswer && products.length === 0;

  return (
    <main className="page-stack">
      {/* Intro */}
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">For Schools, Universities &amp; Colleges</p>
          <h2>Institutional print supplies, sorted for the academic year.</h2>
          <p className="section-copy">
            Question papers, attendance and general registers, service books, and answer booklets —
            printed to institutional formats, in bulk, with secure handling. Buy standard items
            online, or request a quote for large and custom orders.
          </p>
          <div className="action-row">
            <Link className="primary-button" to={CATEGORY_HREF}>
              Browse all supplies
            </Link>
            <a className="secondary-button" href="#quote">
              Request a bulk quote
            </a>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="trust-strip" aria-label="Why institutions order with us">
        {valueProps.map(({ icon: Icon, title, detail }) => (
          <article key={title} className="trust-card">
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--ink-100)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-900)",
                marginBottom: "0.75rem",
              }}
              aria-hidden="true"
            >
              <Icon size={18} strokeWidth={1.7} />
            </span>
            <h3>{title}</h3>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      {/* Products */}
      <section className="section-panel">
        <div className="section-heading section-heading-row">
          <div>
            <p className="eyebrow">Institutional supplies</p>
            <h2>Order registers, papers, and record books.</h2>
          </div>
          <Link className="secondary-button" to={CATEGORY_HREF}>
            View in catalog
          </Link>
        </div>

        {isLoading ? (
          <p className="section-copy">Loading institutional supplies&hellip;</p>
        ) : couldNotLoad ? (
          <div role="status">
            <p className="section-copy">
              We couldn&rsquo;t load institutional supplies just now. Please try again.
            </p>
            <div className="action-row">
              <button type="button" className="secondary-button" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? "Retrying…" : "Try again"}
              </button>
            </div>
          </div>
        ) : answeredButEmpty ? (
          <div className="empty-state-card">
            <p className="eyebrow">Coming soon</p>
            <h3>Institutional supplies are being added.</h3>
            <a className="secondary-button" href="#quote">
              Request a bulk quote instead
            </a>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Bulk quote request */}
      <section id="quote" className="section-panel">
        <div className="section-heading">
          <p className="eyebrow">Bulk &amp; custom orders</p>
          <h2>Request a quote for a large or custom order.</h2>
          <p className="section-copy">
            Tell us your institution, the items, and quantities — we&rsquo;ll prepare a quote and a
            production plan that fits your academic calendar. Purchase-order friendly, no account needed.
          </p>
        </div>
        <BulkQuoteForm products={products} />
      </section>
    </main>
  );
}

export default InstitutionsPage;
