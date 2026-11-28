import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import InfoPage from "./InfoPage";
import { BUSINESS, whatsappUrl } from "../../config/business";

function AboutPage() {
  return (
    <InfoPage
      eyebrow="About us"
      title="About Elite Impressions"
      intro={`Elite Impressions is the online shop of ${BUSINESS.legalName}, a printing press at Manjhili Chowk in Purnia, Bihar.`}
      description="Elite Impressions is the online shop of Bihar Press, a printing press in Purnia, Bihar: business cards, wedding invitations, banners, packaging, merchandise, photo gifts and school supplies."
      path="/about"
    >
      <h2>What we print</h2>
      <p>
        Business and visiting cards, wedding and event invitations, banners and flex, packaging and labels, t-shirts and
        merchandise, personalised photo gifts and frames, and registers, question papers and answer booklets for schools
        and colleges. Everything is printed to order in our Purnia press.
      </p>

      <h2>How ordering works</h2>
      <ul>
        <li>
          Pick a product from the <Link to="/products">catalogue</Link>, or start a design in the{" "}
          <Link to="/customize">Design Studio</Link>.
        </li>
        <li>Upload your own artwork or photo, or tell us what you need and we&rsquo;ll help with the design.</li>
        <li>Pay online or choose cash on delivery where it&rsquo;s offered.</li>
        <li>We print, then ship across India, deliver locally in Purnia, or keep it ready for pickup at the shop.</li>
      </ul>

      <h2>Larger orders</h2>
      <p>
        Prices drop automatically at higher quantities on each product. For weddings, events, businesses and schools
        that need a custom quantity or a written quote, see <Link to="/contact#bulk">bulk orders</Link> or the{" "}
        <Link to="/institutions">quote form for institutions</Link>.
      </p>

      <h2>Visit or reach us</h2>
      <p>
        {BUSINESS.addressDisplay}
        <br />
        Open {BUSINESS.hoursDisplay}
        <br />
        <a href={`tel:${BUSINESS.phone}`}>{BUSINESS.phoneDisplay}</a> ·{" "}
        <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
      </p>

      <div className="info-actions">
        <Link className="primary-button" to="/products">
          Browse products
        </Link>
        <a
          className="secondary-button whatsapp-link"
          href={whatsappUrl("Hi Elite Impressions, I'd like to know about a print order.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={16} aria-hidden="true" /> WhatsApp us
        </a>
      </div>
    </InfoPage>
  );
}

export default AboutPage;
