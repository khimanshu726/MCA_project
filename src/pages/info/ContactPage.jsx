import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import InfoPage from "./InfoPage";
import { BUSINESS, whatsappUrl } from "../../config/business";

export const BULK_MESSAGE = "Hi Elite Impressions, I'd like a quote for a bulk order: (product, quantity, size).";
export const RUSH_MESSAGE = "Hi Elite Impressions, I need a rush print order: (product, quantity) by (date).";

function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact us"
      intro="WhatsApp is the quickest way to reach us: send your question, artwork or photo and we'll reply during shop hours."
      description="Contact Elite Impressions (Bihar Press, Purnia): WhatsApp, phone, email and shop address for print orders, bulk quotes and rush printing."
      path="/contact"
    >
      <div className="contact-cards">
        <a
          className="contact-card contact-card-whatsapp"
          href={whatsappUrl("Hi Elite Impressions, I'd like to know about a print order.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={20} aria-hidden="true" />
          <strong>WhatsApp</strong>
          <span>{BUSINESS.phoneDisplay}</span>
        </a>
        <a className="contact-card" href={`tel:${BUSINESS.phone}`}>
          <Phone size={20} aria-hidden="true" />
          <strong>Call</strong>
          <span>{BUSINESS.phoneDisplay}</span>
        </a>
        <a className="contact-card" href={`mailto:${BUSINESS.email}`}>
          <Mail size={20} aria-hidden="true" />
          <strong>Email</strong>
          <span>{BUSINESS.email}</span>
        </a>
        <a className="contact-card" href={BUSINESS.googleMapsUrl} target="_blank" rel="noopener noreferrer">
          <MapPin size={20} aria-hidden="true" />
          <strong>Visit the shop</strong>
          <span>{BUSINESS.addressDisplay}</span>
        </a>
      </div>
      <p className="info-hours">
        <Clock size={15} aria-hidden="true" /> Open {BUSINESS.hoursDisplay}
      </p>

      <h2 id="bulk">Bulk orders</h2>
      <p>
        Printing for a wedding, an event, your business or a school? Prices already drop at higher quantities on each
        product page. For a custom quantity, size or paper, or a written quote, message us with what you need.
      </p>
      <div className="info-actions">
        <a
          className="secondary-button whatsapp-link"
          href={whatsappUrl(BULK_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={16} aria-hidden="true" /> Ask for a bulk quote
        </a>
        <Link className="ghost-button" to="/institutions">
          Quote form for schools &amp; colleges
        </Link>
      </div>

      <h2 id="rush">Rush printing</h2>
      <p>
        Need it by a date? Before ordering, message us what you need and when. We&rsquo;ll tell you straight away
        whether we can make it in time and the quickest way to get it to you.
      </p>
      <div className="info-actions">
        <a
          className="secondary-button whatsapp-link"
          href={whatsappUrl(RUSH_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={16} aria-hidden="true" /> Ask about a rush order
        </a>
      </div>
    </InfoPage>
  );
}

export default ContactPage;
