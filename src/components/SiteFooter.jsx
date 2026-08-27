import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, Phone, Star } from "lucide-react";
import { getConfiguredSocialLinks } from "../config/socialLinks";
import { BUSINESS } from "../config/business";

/**
 * Brand glyphs for the social row, drawn inline.
 *
 * lucide-react removed its brand marks (Instagram/YouTube/X/LinkedIn/Facebook),
 * so they can't be imported — see the note in config/socialLinks.js. These are
 * line-style paths (24×24, currentColor) that match the rest of the footer's
 * lucide icons, keyed by the same profile `id` the config emits. Add a new
 * platform's glyph here and it renders the moment its URL is configured.
 */
const SOCIAL_ICONS = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  youtube: (
    <>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </>
  ),
  twitter: (
    <>
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
};

function SocialIcon({ id }) {
  const glyph = SOCIAL_ICONS[id];
  if (!glyph) return null;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  );
}

const footerLinks = [
  {
    title: "Shop",
    links: [
      { label: "All Products", to: "/products" },
      { label: "Business Cards", to: "/products?category=Visiting%20Cards" },
      { label: "Marketing", to: "/products?category=Marketing%20Materials" },
      { label: "Packaging", to: "/products?category=Labels%20%26%20Packaging" },
      { label: "Merchandise", to: "/products?category=Clothing%20%26%20Merchandise" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Customize", to: "/customize" },
      { label: "Bulk Orders", to: "/products" },
      { label: "Design Support", to: "/customize" },
      { label: "Rush Print", to: "/products" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Contact", to: "/" },
      { label: "FAQ", to: "/" },
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
    ],
  },
];

function SiteFooter() {
  const socialLinks = getConfiguredSocialLinks();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>Elite Impressions</h3>
          <p>
            Premium print products crafted for growing brands - business cards, packaging,
            merchandise, custom gifts, and event print made easier to order.
          </p>
          {/* Rendered only when at least one profile is configured — an empty
              row of dead buttons says less than no row at all. */}
          {socialLinks.length > 0 ? (
            <nav className="footer-social" aria-label="Elite Impressions on social media">
              {socialLinks.map(({ id, label, url }) => (
                <a
                  key={id}
                  href={url}
                  // Leaves our site, so it opens away from a checkout in
                  // progress. `noopener` denies the opened page access to this
                  // window; `noreferrer` keeps our URLs out of their analytics.
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${label} (opens in a new tab)`}
                  title={`${label} — opens in a new tab`}
                >
                  <SocialIcon id={id} />
                </a>
              ))}
            </nav>
          ) : null}
          {/* Real NAP (name/address/phone), kept in one config and mirrored in
              the homepage LocalBusiness schema so local search sees them agree. */}
          <address className="footer-contact-list">
            <span>
              <MapPin size={14} strokeWidth={1.6} /> {BUSINESS.addressDisplay}
            </span>
            <span>
              <Phone size={14} strokeWidth={1.6} />{" "}
              <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a>
            </span>
            <span>
              <Mail size={14} strokeWidth={1.6} />{" "}
              <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            </span>
            <span>
              <Clock size={14} strokeWidth={1.6} /> {BUSINESS.hoursDisplay}
            </span>
          </address>

          <a
            className="footer-review-link"
            href={BUSINESS.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Star size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Review us on Google</span>
          </a>
        </div>

        {footerLinks.map((section) => (
          <div key={section.title} className="footer-col">
            <h4>{section.title}</h4>
            <ul>
              {section.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} Elite Impressions. All rights reserved.</span>
        {/* Privacy Policy / Terms of Service / Cookies used to sit here as
            `href="#"` — links that consumed a click and did nothing, because
            no such pages exist. They are omitted rather than faked: the one
            thing worse than a missing policy link is one that pretends to be
            a policy. Restore them here once the real pages exist; that is a
            content and legal task, not a markup one. */}
      </div>
    </footer>
  );
}

export default SiteFooter;
