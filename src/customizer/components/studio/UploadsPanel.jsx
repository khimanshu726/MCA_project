import UploadDropzone from "../UploadDropzone.jsx";

/**
 * Artwork intake + a grid of recently used uploads. Clicking a recent item
 * drops it back on the canvas as a new layer — the common case is reusing
 * one logo across both sides of a card.
 */
function UploadsPanel({ onImagesReady, isBusy, recentUploads = [], onReuseUpload }) {
  return (
    <div className="flex flex-col gap-3">
      <UploadDropzone onImagesReady={onImagesReady} isBusy={isBusy} />

      {recentUploads.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Recent</span>
          <div className="grid grid-cols-3 gap-2">
            {recentUploads.map((upload) => (
              <button
                key={upload.id}
                type="button"
                title={`Add ${upload.name}`}
                aria-label={`Add ${upload.name}`}
                onClick={() => onReuseUpload(upload)}
                className="group aspect-square overflow-hidden rounded-lg bg-ink-50 transition-shadow hover:shadow-raised"
              >
                <img
                  src={upload.src}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UploadsPanel;
