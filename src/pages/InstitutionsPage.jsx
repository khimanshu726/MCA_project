import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ShieldCheck, ClipboardList, Clock, CheckCircle2 } from "lucide-react";
import ProductCard from "../components/ProductCard";
import InputField from "../components/InputField";
import { useProducts } from "../hooks/useProducts";
import { createEnquiry } from "../api/enquiriesApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public bulk-quote request form for institutions that procure via quote/PO. */
function BulkQuoteForm() {
  const [form, setForm] = useState({
    institutionName: "",
    institutionType: "school",
    contactName: "",
    email: "",
    phone: "",
    requirements: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
  };

  const validate = () => {
    const next = {};
    if (!form.institutionName.trim()) next.institutionName = "Institution name is required.";
    if (!form.contactName.trim()) next.contactName = "Contact name is required.";
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email.";
    if (!form.requirements.trim()) next.requirements = "Tell us the items and quantities you need.";
    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      await createEnquiry(form);
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
        <BulkQuoteForm />
      </section>
    </main>
  );
}

export default InstitutionsPage;
