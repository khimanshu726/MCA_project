import { Link } from "react-router-dom";
import { ExternalLink, Mail, Phone } from "lucide-react";

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

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "LinkedIn", href: "#" },
];

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>Elite Empressions</h3>
          <p>
            Premium print products crafted for growing brands - business cards, packaging,
            merchandise, custom gifts, and event print made easier to order.
          </p>
          <div className="footer-social">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} aria-label={link.label} title={link.label}>
                <ExternalLink size={16} strokeWidth={1.6} />
              </a>
            ))}
          </div>
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
        <div className="footer-bottom-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Cookies</a>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
