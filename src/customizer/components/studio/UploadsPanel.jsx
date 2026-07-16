import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import StudioHeading from "./StudioHeading.jsx";
import UploadDropzone from "../UploadDropzone.jsx";

/**
 * Artwork intake plus the customer's recent uploads.
 *
 * The panel used to be a lone dropzone in a 256px column — mostly empty,
 * which is what made the sidebar read as wasted space. Recents give it a
 * reason to exist beyond the first upload (the common case is reusing one
 * logo across both sides of a card), and search appears once there are
 * enough items to be worth filtering.
 */
function UploadsPanel({ onImagesReady, isBusy, recentUploads = [], onReuseUpload }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return recentUploads;
    }
    return recentUploads.filter((upload) => upload.name.toLowerCase().includes(term));
  }, [recentUploads, query]);

  return (
    <div className="flex flex-col gap-4">
      <UploadDropzone onImagesReady={onImagesReady} isBusy={isBusy} />

      {recentUploads.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <StudioHeading level={3} className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Recent
            </StudioHeading>
            <span className="text-xs tabular-nums text-ink-400">{recentUploads.length}</span>
          </div>

          {recentUploads.length > 5 ? (
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                aria-label="Search uploads"
                placeholder="Search uploads"
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-lg bg-ink-50 py-1.5 pl-8 pr-2 text-xs text-ink-900 placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          ) : null}

          {filtered.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((upload) => (
                <button
                  key={upload.id}
                  type="button"
                  title={`Add ${upload.name}`}
                  aria-label={`Add ${upload.name}`}
                  onClick={() => onReuseUpload(upload)}
                  className="group aspect-square overflow-hidden rounded-lg bg-ink-50 transition-shadow duration-150 hover:shadow-raised"
                >
                  <img
                    src={upload.src}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          ) : (
            <span className="block py-3 text-center text-xs text-ink-400">No uploads match &ldquo;{query}&rdquo;.</span>
          )}
        </div>
      ) : (
        <span className="block text-xs leading-relaxed text-ink-400">
          Images you add appear here, ready to reuse across sides and future designs.
        </span>
      )}
    </div>
  );
}

export default UploadsPanel;
