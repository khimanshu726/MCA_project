import { useRef, useState } from "react";
import { uploadProductImages } from "../lib/adminApi";

/**
 * Product photo gallery editor: upload by drop or picker, reorder, remove.
 *
 * Works in URLs, not files, because that's what a product stores. Uploading is
 * one way to obtain a URL; the seeded catalog uses external (Pexels) ones, and
 * those have to keep working — so an uploaded photo and a pasted link are the
 * same kind of thing here, and "add by URL" stays available.
 *
 * Order is meaningful: images[0] is the listing thumbnail, which is why
 * reordering exists at all. It's done with explicit buttons rather than drag
 * and drop — a keyboard user can reorder, and there's no drag layer to escape
 * its container.
 */
const MAX_IMAGES = 8;

function ProductImageUploader({ images, onChange, token, error, storageDurable = true }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());
  const [urlDraft, setUrlDraft] = useState("");
  const inputRef = useRef(null);

  const remaining = MAX_IMAGES - images.length;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setUploadError("");

    if (files.length > remaining) {
      setUploadError(`You can add ${remaining} more image${remaining === 1 ? "" : "s"} (max ${MAX_IMAGES}).`);
      return;
    }

    setIsUploading(true);
    try {
      const response = await uploadProductImages(files, token);
      onChange([...images, ...response.images]);
    } catch (uploadFailure) {
      setUploadError(uploadFailure.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      // Let the same file be re-picked after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (from, to) => {
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const removeAt = (index) => onChange(images.filter((_, i) => i !== index));

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    if (images.length >= MAX_IMAGES) {
      setUploadError(`Maximum ${MAX_IMAGES} images.`);
      return;
    }
    onChange([...images, url]);
    setUrlDraft("");
    setUploadError("");
  };

  return (
    <div className="input-field">
      <span className="field-label strong-label">Photos</span>

      {images.length > 0 ? (
        <ul className="image-thumb-grid">
          {images.map((url, index) => (
            <li key={`${url}-${index}`} className="image-thumb">
              {brokenUrls.has(url) ? (
                <span className="image-thumb-broken" title={url}>
                  Image failed to load
                </span>
              ) : (
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  onError={() => setBrokenUrls((current) => new Set(current).add(url))}
                />
              )}

              {/* Order carries meaning, so the first slot says so out loud
                  rather than leaving the admin to infer it. */}
              {index === 0 ? <span className="image-thumb-primary">Primary</span> : null}

              <div className="image-thumb-actions">
                <button
                  type="button"
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label={`Move image ${index + 1} later`}
                  disabled={index === images.length - 1}
                  onClick={() => move(index, index + 1)}
                >
                  ›
                </button>
                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  className="image-thumb-remove"
                  onClick={() => removeAt(index)}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!storageDurable ? (
        <p className="availability-note availability-danger">
          File storage isn’t configured, so uploads can’t be saved. Add photos by URL, or set the Cloudinary keys.
        </p>
      ) : null}

      {remaining > 0 && storageDurable ? (
        <div
          className={`image-dropzone ${isDragging ? "is-dragging" : ""} ${isUploading ? "is-busy" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => !isUploading && inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            hidden
            onChange={(event) => handleFiles(event.target.files)}
          />
          <strong>{isUploading ? "Uploading…" : "Drop photos here, or click to choose"}</strong>
          <span>PNG, JPG, or WebP · up to 5MB each · {remaining} slot{remaining === 1 ? "" : "s"} left</span>
        </div>
      ) : null}

      {remaining === 0 ? <p className="field-helper">Maximum {MAX_IMAGES} images reached.</p> : null}

      <details className="image-url-fallback">
        <summary>Add by URL</summary>
        <div className="image-url-row">
          <input
            type="url"
            value={urlDraft}
            placeholder="https://example.com/photo.jpg"
            aria-label="Image URL"
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addUrl();
              }
            }}
          />
          <button type="button" className="secondary-button compact-button" onClick={addUrl}>
            Add
          </button>
        </div>
      </details>

      {uploadError ? <p className="field-error">{uploadError}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export default ProductImageUploader;
