import { Link } from "react-router-dom";
import { promoMessage } from "../data";

function PromoStrip() {
  return (
    <div className="promo-strip" role="region" aria-label="Promotion">
      <p>{promoMessage}</p>
      <Link className="promo-link" to="/products">
        Explore all categories
      </Link>
    </div>
  );
}

export default PromoStrip;
