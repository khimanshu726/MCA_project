import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAdminProducts, updateCollectionDesigns } from "../lib/adminApi";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

/**
 * Picks existing products to move into the collection, several at once.
 * Lists every product not already in it; ones in another collection say so,
 * since adding them moves them.
 */
function ExistingProductsPicker({ token, collection, collectionNames, onAdd, onCancel, isBusy }) {
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    fetchAdminProducts(token, { limit: 100 })
      .then((data) => {
        if (!cancelled) setCandidates((data.items || []).filter((row) => row.collectionId !== collection.id));
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message || "Unable to load products.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, collection.id]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (candidates || []).filter(
      (row) => !needle || `${row.name} ${row.category}`.toLowerCase().includes(needle),
    );
  }, [candidates, query]);

  const toggle = (id) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="delivery-form-card new-hsn-panel" role="group" aria-label="Add existing products">
      <p className="eyebrow">Add existing products</p>
      <input
        type="search"
        aria-label="Search products"
        placeholder="Search by name or category"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {error ? <p className="field-error">{error}</p> : null}
      {candidates === null && !error ? <p className="section-copy">Loading products…</p> : null}
      {candidates && shown.length === 0 ? <p className="section-copy">No other products match.</p> : null}
      {shown.length > 0 ? (
        <ul className="collection-picker-list">
          {shown.map((row) => (
            <li key={row.id}>
              <label className="checkbox-row">
                <input type="checkbox" checked={picked.has(row.id)} onChange={() => toggle(row.id)} />
                <span>
                  <strong>{row.name}</strong>{" "}
                  <small>
                    {row.category}
                    {row.collectionId
                      ? ` · now in ${collectionNames.get(row.collectionId) || "another collection"} (will move)`
                      : ""}
                  </small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="action-row">
        <button
          type="button"
          className="primary-button"
          disabled={picked.size === 0 || isBusy}
          onClick={() => onAdd([...picked])}
        >
          {picked.size === 0 ? "Pick products to add" : `Add ${picked.size} to ${collection.name}`}
        </button>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={isBusy}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * The designs inside one collection, as the owner manages them: a photo of
 * each, whether it's on the shop (with Publish for the ones that aren't),
 * Remove, adding existing products, and "+ Add a design" for a new one.
 */
function CollectionDesignsList({ token, collection, collectionNames = new Map(), onChanged }) {
  const [designs, setDesigns] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminProducts(token, { collection: collection.id, limit: 100 });
      setDesigns(data.items || []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load the designs.");
    }
  }, [token, collection.id]);

  useEffect(() => {
    setDesigns(null);
    load();
  }, [load]);

  const hidden = (designs || []).filter((design) => design.status !== "active");
  // Designs listed under a different category than the collection make it show
  // up in two places on the shop; one click lines them up.
  const offCategory = (designs || []).filter((design) => design.category !== collection.category);
  const otherCategories = [...new Set(offCategory.map((design) => design.category))].join(", ");

  const change = async (changes, describe) => {
    setIsBusy(true);
    setMessage("");
    try {
      const data = await updateCollectionDesigns(collection.id, changes, token);
      await load();
      onChanged?.(data.collection);
      setMessage(describe(data.changed));
      return true;
    } catch (changeError) {
      setMessage(changeError.payload?.errors?.add || changeError.message || "Unable to update the designs.");
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const publish = (ids) =>
    change({ publish: ids }, ({ published }) =>
      published === 1 ? "1 design is now on the shop." : `${published} designs are now on the shop.`,
    );

  const remove = (design) => {
    if (!window.confirm(`Take “${design.name}” out of ${collection.name}? It stays in your catalogue on its own.`)) {
      return;
    }
    change({ remove: [design.id] }, () => `“${design.name}” is no longer in ${collection.name}.`);
  };

  const addExisting = async (ids) => {
    const ok = await change({ add: ids }, ({ added }) =>
      added === 1 ? `Added 1 product to ${collection.name}.` : `Added ${added} products to ${collection.name}.`,
    );
    if (ok) setIsPicking(false);
  };

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
      {designs && designs.length === 0 ? <p className="section-copy">No designs yet. Add the first one.</p> : null}
      {hidden.length > 0 ? (
        <div className="availability-note availability-warn collection-hidden-note" role="status">
          <span>
            {hidden.length} design{hidden.length === 1 ? " is" : "s are"} not on the shop yet (draft or archived).
          </span>
          {hidden.length > 1 ? (
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={() => publish(hidden.map((design) => design.id))}
            >
              Publish all {hidden.length}
            </button>
          ) : null}
        </div>
      ) : null}
      {offCategory.length > 0 ? (
        <div className="availability-note availability-warn collection-hidden-note">
          <span>
            {offCategory.length} design{offCategory.length === 1 ? " is" : "s are"} listed under {otherCategories}, so
            this collection also shows there. It&rsquo;s set to show under {collection.category}.
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={isBusy}
            onClick={() =>
              change({ category: collection.category }, ({ recategorized }) =>
                recategorized === 1
                  ? `1 design is now listed under ${collection.category}.`
                  : `${recategorized} designs are now listed under ${collection.category}.`,
              )
            }
          >
            List all under {collection.category}
          </button>
        </div>
      ) : null}
      {designs && designs.length > 0 ? (
        <ul className="collection-designs-list">
          {designs.map((design) => (
            <li key={design.id}>
              {design.images?.[0] ? (
                <img className="collection-design-thumb" src={design.images[0]} alt="" loading="lazy" />
              ) : (
                <span className="collection-design-thumb" aria-hidden="true" />
              )}
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
              <span className="collection-design-actions">
                {design.status !== "active" ? (
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isBusy}
                    onClick={() => publish([design.id])}
                    aria-label={`Publish ${design.name}`}
                  >
                    Publish
                  </button>
                ) : null}
                <button
                  type="button"
                  className="ghost-button"
                  disabled={isBusy}
                  onClick={() => remove(design)}
                  aria-label={`Remove ${design.name} from the collection`}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? (
        <p className="submit-message" role="status">
          {message}
        </p>
      ) : null}
      {isPicking ? (
        <ExistingProductsPicker
          token={token}
          collection={collection}
          collectionNames={collectionNames}
          onAdd={addExisting}
          onCancel={() => setIsPicking(false)}
          isBusy={isBusy}
        />
      ) : (
        <div className="action-row">
          <button type="button" className="secondary-button" onClick={() => setIsPicking(true)}>
            + Add existing products…
          </button>
        </div>
      )}
    </div>
  );
}

export default CollectionDesignsList;
