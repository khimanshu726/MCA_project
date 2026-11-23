import { useEffect, useState } from "react";
import { fetchAdminProducts } from "../lib/adminApi";

const MAX_PHOTOS = 12;

/**
 * "Or use a design's photo": the photos already uploaded for the collection's
 * designs, so the cover can be one of them without uploading it again.
 */
function DesignPhotoPicker({ token, collectionId, value, onPick }) {
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!collectionId) return undefined;
    let cancelled = false;
    fetchAdminProducts(token, { collection: collectionId, limit: 100 })
      .then((data) => {
        if (cancelled) return;
        const urls = (data.items || []).flatMap((design) => design.images || []);
        setPhotos([...new Set(urls)].slice(0, MAX_PHOTOS));
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, collectionId]);

  if (photos.length === 0) return null;

  return (
    <div className="design-photo-picker" role="group" aria-label="Use a design's photo as the cover">
      <p className="field-label">Or use a design&rsquo;s photo</p>
      <ul>
        {photos.map((url, index) => (
          <li key={url}>
            <button
              type="button"
              className={url === value ? "is-picked" : ""}
              aria-pressed={url === value}
              aria-label={`Use design photo ${index + 1} as the cover`}
              onClick={() => onPick(url)}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DesignPhotoPicker;
