import { Link } from "react-router-dom";
import InfoPage from "./InfoPage";
import { POLICY_UPDATED } from "./PrivacyPage";
import { BUSINESS } from "../../config/business";

// The order rules here match how the shop works: orders can be cancelled from
// the account while Placed or Confirmed, and a return is requested from the
// order page once Delivered. Update both together if that changes.
function TermsPage() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms of service"
      intro={`The terms for ordering from ${BUSINESS.name}, the online shop of ${BUSINESS.legalName}, Purnia, Bihar.`}
      description="Terms for ordering custom print from Elite Impressions: orders, your artwork, payment, cancellations and returns."
      path="/terms"
      updated={POLICY_UPDATED}
    >
      <h2>Orders and prices</h2>
      <p>
        Prices are in Indian rupees and shown on each product. Many products cost less per piece at higher quantities;
        the price for your quantity is the one charged at checkout, along with any delivery charge shown there. Your
        order is confirmed when you receive our order confirmation.
      </p>

      <h2>Your artwork, text and photos</h2>
      <ul>
        <li>
          Check names, dates, spellings and numbers before you order. We print what you send or approve, so mistakes in
          the design you supply aren&rsquo;t a print fault.
        </li>
        <li>
          Only send material you have the right to use. We may refuse to print anything that copies someone else&rsquo;s
          work or brand, or that is unlawful or offensive.
        </li>
        <li>
          Colours on a screen can look slightly different on paper, and small variations in colour and cutting between
          print runs are normal.
        </li>
      </ul>

      <h2>Lead times and delivery</h2>
      <p>
        Each product shows an estimated time to get it ready. Delivery time depends on where you are and on the courier.
        Need it by a date? <Link to="/contact#rush">Ask us first</Link>.
      </p>

      <h2>Payment</h2>
      <p>Pay online through Razorpay, or cash on delivery where the checkout offers it.</p>

      <h2>Cancelling an order</h2>
      <p>
        You can cancel an order from <Link to="/account/orders">your orders</Link> while it shows as Placed or
        Confirmed, before printing begins. Once printing has started, a custom order can&rsquo;t be cancelled because it
        is made only for you.
      </p>

      <h2>Problems with your order</h2>
      <p>
        If an item arrives damaged, defective or printed differently from what you approved, request a return from the
        order page or contact us as soon as possible, with photos. We&rsquo;ll check it and reprint or refund the
        affected items. Because personalised items are made to order, we can&rsquo;t take them back for a change of
        mind.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · {BUSINESS.phoneDisplay}{" "}
        · {BUSINESS.addressDisplay}
      </p>
    </InfoPage>
  );
}

export default TermsPage;
