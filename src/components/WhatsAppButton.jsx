import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { whatsappUrl } from "../config/business";

/**
 * Floating "WhatsApp us" button on every shop page. Most print orders in India
 * start on WhatsApp; the chat opens with the page the customer is looking at
 * already in the message, so we know which product they mean.
 * Hidden during checkout, where it would sit over the payment step.
 */
export const whatsappMessageFor = (pathname, href) =>
  /^\/products\/[^/]+/.test(pathname) || /^\/collections\//.test(pathname)
    ? `Hi Elite Impressions, I have a question about this: ${href}`
    : "Hi Elite Impressions, I'd like to know about a print order.";

function WhatsAppButton() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/checkout")) return null;

  const href = typeof window === "undefined" ? "" : window.location.href;

  return (
    <a
      className="whatsapp-fab"
      href={whatsappUrl(whatsappMessageFor(pathname, href))}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp (opens WhatsApp)"
    >
      <MessageCircle size={22} strokeWidth={2} aria-hidden="true" />
      <span className="whatsapp-fab-label">WhatsApp us</span>
    </a>
  );
}

export default WhatsAppButton;
