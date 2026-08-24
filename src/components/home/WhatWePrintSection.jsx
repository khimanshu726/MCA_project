import { Link } from "react-router-dom";

/**
 * Crawlable, human-first "what we print" section. Gives Google (and shoppers) a
 * plain-language summary of the real catalog with descriptive internal links to
 * each category — no invented products, no keyword stuffing.
 */
const SERVICES = [
  {
    title: "Business & visiting cards",
    to: "/products?category=Visiting%20Cards",
    copy: "Premium visiting cards in matte, soft-touch, and foil finishes.",
  },
  {
    title: "Flyers & marketing materials",
    to: "/products?category=Marketing%20Materials",
    copy: "Flyers, brochures, and posters for launches and promotions.",
  },
  {
    title: "Banners",
    to: "/products?category=Banners",
    copy: "Large-format storefront and event banners.",
  },
  {
    title: "Wedding & event invitations",
    to: "/products?category=Invitations",
    copy: "Layered invitation suites with coordinated envelopes.",
  },
  {
    title: "Packaging & labels",
    to: "/products?category=Labels%20%26%20Packaging",
    copy: "Boxes, sleeves, and product labels for modern brands.",
  },
  {
    title: "T-shirts & merchandise",
    to: "/products?category=Clothing%20%26%20Merchandise",
    copy: "Custom apparel and branded merchandise.",
  },
  {
    title: "Photo gifts",
    to: "/products?category=Photo%20Gifts",
    copy: "Personalized mugs and photo keepsakes.",
  },
  {
    title: "Stationery",
    to: "/products?category=Stationery",
    copy: "Custom notebooks and office-ready print.",
  },
  {
    title: "Institutional supplies",
    to: "/institutions",
    copy: "Question papers, registers, and record books printed in bulk.",
  },
];

function WhatWePrintSection() {
  return (
    <section className="section-panel" aria-labelledby="what-we-print-heading">
      <div className="section-heading">
        <p className="eyebrow">What we print &amp; customize</p>
        <h2 id="what-we-print-heading">A printing press in Purnia for business, events, and institutions.</h2>
        <p className="section-copy">
          Elite Impressions is the online store of <strong>Bihar Press</strong>, a printing press in Purnia,
          Bihar. Order custom and personalized print online with pan-India shipping, local delivery in Purnia,
          and store pickup — from everyday business cards to full wedding invitation suites and institutional
          exam supplies.
        </p>
      </div>
      <ul className="what-we-print-grid">
        {SERVICES.map((service) => (
          <li key={service.title} className="what-we-print-item">
            <Link to={service.to} className="what-we-print-link">
              {service.title}
            </Link>
            <p>{service.copy}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default WhatWePrintSection;
