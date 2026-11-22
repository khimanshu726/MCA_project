import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminProducts } from "../lib/adminApi";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

/**
 * The designs inside one collection, as the owner manages them: every design
 * with its status (drafts are not on the shop), a link to edit each, and the
 * way to add the next one straight into this collection.
 */
function CollectionDesignsList({ token, collection }) {
  const [designs, setDesigns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDesigns(null);
    setError("");
    fetchAdminProducts(token, { collection: collection.id, limit: 100 })
      .then((data) => {
        if (!cancelled) setDesigns(data.items || []);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Unable to load the designs.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, collection.id]);

  const hidden = (designs || []).filter((design) => design.status !== "active");

  return (
    <div className="collection-designs" role="group" aria-label={`Designs in ${collection.name}`}>
      <div className="admin-panel-head">
        <p className="eyebrow">Designs in this collection</p>
        <Link className="primary-button" to={`/admin/products?addTo=${encodeURIComponent(collection.id)}`}>
          + Add a design
        </Link>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {designs === null && !error ? <p className="section-copy">Loading designs…</p> : null}
      {designs && designs.length === 0 ? (
        <p className="section-copy">No designs yet. Add the first one.</p>
      ) : null}
      {hidden.length > 0 ? (
        <p className="availability-note availability-warn" role="status">
          {hidden.length} design{hidden.length === 1 ? " is" : "s are"} not on the shop yet (draft or archived). Open{" "}
          {hidden.length === 1 ? "it" : "each one"} and set Status to active.
        </p>
      ) : null}
      {designs && designs.length > 0 ? (
        <ul className="collection-designs-list">
          {designs.map((design) => (
            <li key={design.id}>
              <Link to={`/admin/products?edit=${encodeURIComponent(design.id)}`}>
                <strong>{design.name}</strong>
                <span>
                  {design.designType ? `${design.designType} · ` : ""}
                  {formatMoney(design.price)}
                </span>
              </Link>
              <span className={`status-badge status-${design.status}`}>
                {design.status === "active" ? "on the shop" : `${design.status} · hidden`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default CollectionDesignsList;
