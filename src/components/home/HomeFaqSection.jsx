import { Link } from "react-router-dom";
import { BUSINESS } from "../../config/business";

/**
 * Homepage FAQ — answers grounded in the site's real capabilities only (the
 * design studio, the catalog, bulk/institutional quotes, and the support email).
 * Deliberately avoids anything unverifiable — shipping times, delivery areas,
 * prices, guarantees, returns — which need real business policy to state.
 *
 * Emits FAQPage structured data. (Google now shows FAQ rich results mainly for
 * authoritative sites, so treat the schema as valid metadata rather than a
 * guaranteed rich result.)
 */
const SUPPORT_EMAIL = "hello@elite-empressions.com";

const FAQS = [
  {
    q: "What can I get printed or personalized?",
    a: (
      <>
        A full range of print: business &amp; visiting cards, flyers and marketing materials, banners, wedding and
        event invitations, packaging and labels, t-shirts and merchandise, photo gifts, stationery, and{" "}
        <Link to="/institutions">institutional supplies</Link>. Browse everything in the{" "}
        <Link to="/products">product catalog</Link>.
      </>
    ),
    text:
      "A full range of print: business & visiting cards, flyers and marketing materials, banners, wedding and event invitations, packaging and labels, t-shirts and merchandise, photo gifts, stationery, and institutional supplies.",
  },
  {
    q: "Can I upload my own design or photo?",
    a: (
      <>
        Yes. Use the online <Link to="/customize">Design Studio</Link> to start from a template, upload your own
        artwork or photo, add text and graphics, and see a live preview before you order.
      </>
    ),
    text:
      "Yes. Use the online Design Studio to start from a template, upload your own artwork or photo, add text and graphics, and see a live preview before you order.",
  },
  {
    q: "How does customization work?",
    a: (
      <>
        Pick a product, open the <Link to="/customize">Design Studio</Link>, then add your text, images, or an
        uploaded file. You&rsquo;ll see a live preview as you go — when it looks right, add it to your cart and
        check out.
      </>
    ),
    text:
      "Pick a product, open the Design Studio, then add your text, images, or an uploaded file. You see a live preview as you go — when it looks right, add it to your cart and check out.",
  },
  {
    q: "How long does an order take?",
    a: (
      <>
        Turnaround depends on the product — each product page shows its own lead time (many items are ready in
        about 3&ndash;7 days). Check the product page for the exact estimate.
      </>
    ),
    text:
      "Turnaround depends on the product — each product page shows its own lead time (many items are ready in about 3–7 days). Check the product page for the exact estimate.",
  },
  {
    q: "Can I order in bulk or for my school or college?",
    a: (
      <>
        Yes. We offer bulk pricing plus dedicated{" "}
        <Link to="/institutions">institutional supplies</Link> — question papers, attendance and general
        registers, service books, and answer booklets. You can buy standard items online or request a bulk quote.
      </>
    ),
    text:
      "Yes. We offer bulk pricing plus dedicated institutional supplies — question papers, attendance and general registers, service books, and answer booklets. You can buy standard items online or request a bulk quote.",
  },
  {
    q: "Do you ship or deliver?",
    a: (
      <>
        Yes — we offer <strong>pan-India shipping</strong>, <strong>local delivery in Purnia</strong>, and{" "}
        <strong>store pickup</strong> at our Purnia shop.
      </>
    ),
    text: "Yes — we offer pan-India shipping, local delivery in Purnia, and store pickup at our Purnia shop.",
  },
  {
    q: "Where are you located?",
    a: (
      <>
        {BUSINESS.addressDisplay}. We&rsquo;re open {BUSINESS.hoursDisplay}. Call{" "}
        <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a> or email{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
      </>
    ),
    text: `${BUSINESS.addressDisplay}. We're open ${BUSINESS.hoursDisplay}. Call ${BUSINESS.phoneDisplay} or email ${BUSINESS.email}.`,
  },
  {
    q: "How do I place an order?",
    a: (
      <>
        Browse the <Link to="/products">catalog</Link>, customize your product if you like, add it to your cart,
        and check out securely online.
      </>
    ),
    text:
      "Browse the catalog, customize your product if you like, add it to your cart, and check out securely online.",
  },
  {
    q: "How can I get in touch?",
    a: (
      <>
        Email us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we&rsquo;ll help with quotes,
        artwork checks, or bulk orders.
      </>
    ),
    text: `Email us at ${SUPPORT_EMAIL} and we'll help with quotes, artwork checks, or bulk orders.`,
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.text },
  })),
};

function HomeFaqSection() {
  return (
    <section className="section-panel" aria-labelledby="home-faq-heading">
      <div className="section-heading">
        <p className="eyebrow">FAQ</p>
        <h2 id="home-faq-heading">Frequently asked questions.</h2>
      </div>
      <div className="faq-list">
        {FAQS.map((item) => (
          <details key={item.q} className="faq-item">
            <summary>{item.q}</summary>
            <div className="faq-answer section-copy">{item.a}</div>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  );
}

export default HomeFaqSection;
