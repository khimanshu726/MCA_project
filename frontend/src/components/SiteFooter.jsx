import { Link } from "react-router-dom";
import { Instagram, Twitter, Linkedin, Mail, Phone, Youtube } from "lucide-react";

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
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <h3>Elite Empressions</h3>
          <p>Premium print products crafted for growing brands—business cards, packaging, merch, and event print made effortless.</p>
          <div className="footer-social">
            <a href="#" aria-label="Instagram"><Instagram size={16} strokeWidth={1.6} /></a>
            <a href="#" aria-label="YouTube"><Youtube size={16} strokeWidth={1.6} /></a>
            <a href="#" aria-label="Twitter"><Twitter size={16} strokeWidth={1.6} /></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={16} strokeWidth={1.6} /></a>
          </div>
          <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--ink-400)", fontSize: "0.85rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <Mail size={14} strokeWidth={1.6} /> hello@elite-empressions.com
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
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
        <span>© {new Date().getFullYear()} Elite Empressions. All rights reserved.</span>
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
