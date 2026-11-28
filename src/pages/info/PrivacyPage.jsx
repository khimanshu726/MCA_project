import { Link } from "react-router-dom";
import InfoPage from "./InfoPage";
import { BUSINESS } from "../../config/business";

// Describes what this site actually collects and the services it really uses
// (Firebase sign-in, Razorpay, Cloudinary, Resend, couriers). Update it when
// any of those change.
export const POLICY_UPDATED = "28 November 2026";

function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy"
      title="Privacy policy"
      intro={`How ${BUSINESS.name} (${BUSINESS.legalName}, Purnia) handles the details you share when you order from us.`}
      description="How Elite Impressions collects, uses and protects your details, uploaded artwork and photos."
      path="/privacy"
      updated={POLICY_UPDATED}
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address and phone number when you sign in (with Google,
          email or a phone code).
        </li>
        <li>
          <strong>Order details:</strong> delivery address, the products and quantities you order, and any notes or
          instructions.
        </li>
        <li>
          <strong>Files you upload:</strong> artwork, designs and photos for personalised products, so we can print
          them.
        </li>
        <li>
          <strong>Messages:</strong> what you send us by WhatsApp, phone, email or our quote forms.
        </li>
        <li>
          <strong>Payments:</strong> online payments are handled by Razorpay. We receive confirmation that you paid,
          never your card, UPI or bank details.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To print, pack and deliver your order, and to contact you about it.</li>
        <li>To send order confirmations and delivery updates by email.</li>
        <li>To keep the order and invoice records that Indian tax law requires.</li>
        <li>To keep your account, saved addresses, cart and wishlist working.</li>
      </ul>
      <p>We don&rsquo;t sell your details or use them for advertising, and the site runs no advertising trackers.</p>

      <h2>Who else handles it</h2>
      <p>Only the services we need to run the shop, each for its own part:</p>
      <ul>
        <li>Google Firebase, for signing in.</li>
        <li>Razorpay, for online payments.</li>
        <li>Cloudinary, for storing uploaded artwork and photos (customers&rsquo; photos are stored privately).</li>
        <li>Our email provider, for order emails.</li>
        <li>Courier partners, who receive your name, address and phone number to deliver.</li>
        <li>Our website hosting and database providers.</li>
      </ul>

      <h2>Your files and photos</h2>
      <p>
        We use the artwork and photos you upload only to make your order. Photos for personalised products are stored
        privately: they aren&rsquo;t published on the site, and only our staff can open them, through links that stop
        working after a few minutes. They&rsquo;re kept with the order record so we can reprint or answer questions
        about it. Ask us and we&rsquo;ll delete them once your order is complete.
      </p>

      <h2>Your browser</h2>
      <p>
        The site stores a few things in your browser so they survive a refresh: your cart, wishlist, recently viewed
        products and the photos you&rsquo;ve added to personalised products. Clearing your browser data removes them.
      </p>

      <h2>Your choices</h2>
      <p>
        You can see your orders and addresses in your <Link to="/account">account</Link>. To get a copy of your details,
        correct them or have them deleted, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>. We keep
        order and invoice records for as long as the law requires, even after an account is deleted.
      </p>

      <h2>Contact</h2>
      <p>
        {BUSINESS.legalName}, {BUSINESS.addressDisplay} · <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> ·{" "}
        {BUSINESS.phoneDisplay}
      </p>
    </InfoPage>
  );
}

export default PrivacyPage;
