import { Link } from "react-router-dom";
import { ExternalLink, Mail, Phone } from "lucide-react";
import { getConfiguredSocialLinks } from "../config/socialLinks";

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
          <h3>Elite Empressions</h3>
          <p>
            Premium print products crafted for growing brands - business cards, packaging,
            merchandise, custom gifts, and event print made easier to order.
          </p>
          {/* Rendered only when at least one profile is configured — an empty
              row of dead buttons says less than no row at all. */}
          {socialLinks.length > 0 ? (
            <nav className="footer-social" aria-label="Elite Empressions on social media">
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
                  <span>{label}</span>
                  <ExternalLink size={13} strokeWidth={1.6} aria-hidden="true" />
                </a>
              ))}
            </nav>
          ) : null}
          <div className="footer-contact-list">
            <span>
              <Mail size={14} strokeWidth={1.6} /> hello@elite-empressions.com
            </span>
            <span>
              <Phone size={14} strokeWidth={1.6} /> +91 98765 43210
            </span>
          </div>
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
        <span>&copy; {new Date().getFullYear()} Elite Empressions. All rights reserved.</span>
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
