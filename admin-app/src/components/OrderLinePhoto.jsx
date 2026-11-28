import { useEffect, useState } from "react";
import { API_ASSET_BASE_URL, fetchCustomerPhotoLink } from "../lib/adminApi";

const absolute = (url) => (/^https?:\/\//i.test(url) ? url : `${API_ASSET_BASE_URL}${url}`);

/**
 * The customer's photo on a personalised order line. Photos are private, so
 * this asks the server for a link that works for 15 minutes and shows it; the
 * link is fetched again whenever the order is reopened.
 */
function OrderLinePhoto({ photo, productName, token }) {
  const [link, setLink] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLink(null);
    setError("");
    fetchCustomerPhotoLink(photo.id, token)
      .then((result) => {
        if (!cancelled) setLink(absolute(result.url));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Couldn't open the photo.");
      });
    return () => {
      cancelled = true;
    };
  }, [photo.id, token]);

  if (error) {
    return <span className="field-error">Customer photo: {error}</span>;
  }
  if (!link) {
    return <span className="order-line-photo is-loading">Loading customer photo…</span>;
  }
  return (
    <a className="order-line-photo" href={link} target="_blank" rel="noreferrer">
      <img src={link} alt={`Customer photo for ${productName}`} />
      <span>Open customer photo</span>
    </a>
  );
}

export default OrderLinePhoto;
