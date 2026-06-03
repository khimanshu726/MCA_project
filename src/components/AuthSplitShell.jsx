import { Link } from "react-router-dom";
import authIllustration from "../assets/images/auth-illustration.svg";
import ResponsiveImage from "./ResponsiveImage";

const defaultHighlights = [
  "100% pre-fill for repeat delivery and account details.",
  "Quick product browsing, uploads, and order-ready checkout flow.",
  "Faster repeat ordering across cards, banners, packaging, and gifts.",
];

function AuthSplitShell({
  eyebrow,
  title,
  subtitle,
  promptText,
  promptLinkTo,
  promptLinkLabel,
  children,
  leftHeadline = "Maximum convenience for custom print orders",
  leftCaption = "Elite Empressions helps customers log in quickly, manage their details, and move from product selection to checkout without extra friction.",
  highlights = defaultHighlights,
}) {
  return (
    <main className="auth-screen">
      <section className="auth-split-shell">
        <aside className="auth-showcase-panel">
          <div className="auth-showcase-visual">
            <ResponsiveImage
              src={authIllustration}
              alt="Illustration of a professional working at a desk with finance and productivity panels"
              className="auth-showcase-image"
              aspectClassName="ratio-card"
              priority
            />
          </div>

          <div className="auth-showcase-copy">
            <h2>{leftHeadline}</h2>
            <p>{leftCaption}</p>
            <ul className="auth-benefits-list">
              {highlights.map((item) => (
                <li key={item}>
                  <span className="auth-benefit-icon" aria-hidden="true">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="auth-showcase-footer">
            <div className="auth-footer-brand">
              <span className="auth-brand-mark">EI</span>
              <div>
                <strong>Elite Empressions</strong>
                <span>Print storefront platform</span>
              </div>
            </div>
            <p>Elite Empressions is built for smooth account access, saved customer details, and quick print ordering.</p>
          </div>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-panel-topbar">
            <p className="auth-top-prompt">
              <span>{promptText}</span>{" "}
              <Link to={promptLinkTo}>{promptLinkLabel}</Link>
            </p>
          </div>

          <div className="auth-form-card">
            <p className="auth-panel-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="auth-panel-subtitle">{subtitle}</p>
            {children}
          </div>
        </section>
      </section>
    </main>
  );
}

export default AuthSplitShell;
