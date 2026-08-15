import { Link } from "react-router-dom";
import { FileText, ShieldCheck, ClipboardList, Clock } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hooks/useProducts";

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

      {/* Bulk quote — the form is wired in the next increment; the anchor and
          entry point ship now so the CTAs above are never dead. */}
      <section id="quote" className="essentials-grid">
        <article className="section-panel essentials-card">
          <p className="eyebrow">Bulk &amp; custom orders</p>
          <h2>Need a quote for a large or custom order?</h2>
          <p className="section-copy">
            Tell us your institution, the items, and quantities — we&rsquo;ll prepare a quote and a
            production plan that fits your academic calendar. Purchase-order friendly.
          </p>
          <div className="action-row">
            <Link className="primary-button" to={CATEGORY_HREF}>
              Browse supplies
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default InstitutionsPage;
