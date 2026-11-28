import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { readImageFiles } from "../customizer/components/UploadDropzone";
import { uploadCustomerPhoto } from "../api/customerPhotosApi";
import { useUserAuth } from "../context/UserAuthContext";
import { getPersonalPhoto, setPersonalPhoto } from "../utils/personalPhotos";

// Below this on the shorter side, an A3/A4 print starts to look soft.
const SMALL_PHOTO_PX = 1200;

/**
 * A tiny square preview of the picked photo as a data URL (a few KB), for the
 * capsule, cart and checkout. Empty if the browser can't draw it.
 */
export const makeThumbnail = (src, size = 96) =>
  new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext?.("2d");
      if (!context) return resolve("");
      canvas.width = size;
      canvas.height = size;
      const image = new Image();
      // Never hold up the upload for a preview.
      const giveUp = setTimeout(() => resolve(""), 3000);
      image.onload = () => {
        clearTimeout(giveUp);
        try {
          const side = Math.min(image.naturalWidth, image.naturalHeight);
          const sx = (image.naturalWidth - side) / 2;
          const sy = (image.naturalHeight - side) / 2;
          context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        } catch {
          resolve("");
        }
      };
      image.onerror = () => {
        clearTimeout(giveUp);
        resolve("");
      };
      image.src = src;
    } catch {
      resolve("");
    }
  });

/**
 * The upload dialog for a personalised product: pick, drop or paste a photo,
 * see it, then upload it. Rendered into <body> so a card's hover transform
 * can't trap the fixed overlay inside the card.
 */
function PhotoUploadDialog({ open, onClose, product, onUploaded, confirmLabel = "Use this photo" }) {
  const { token } = useUserAuth();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const [picked, setPicked] = useState(null); // { src, naturalWidth, naturalHeight, file }
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const current = open ? getPersonalPhoto(product.id) : null;

  // A fresh dialog each time it opens.
  useEffect(() => {
    if (!open) return undefined;
    setPicked(null);
    setError("");
    setIsUploading(false);
    dialogRef.current?.focus();
    return undefined;
  }, [open]);

  // Release the preview's object URL when it's replaced or the dialog closes.
  useEffect(() => () => picked && URL.revokeObjectURL(picked.src), [picked]);

  const takeFiles = useCallback(async (fileList) => {
    if (!fileList?.length) return;
    setError("");
    const { images, error: readError } = await readImageFiles([fileList[0]]);
    if (readError) setError(readError);
    if (images[0]) setPicked(images[0]);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isUploading) onClose();
    };
    // Paste a photo straight from the clipboard.
    const handlePaste = (event) => {
      const files = [...(event.clipboardData?.files || [])];
      if (files.length) takeFiles(files);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("paste", handlePaste);
    };
  }, [open, isUploading, onClose, takeFiles]);

  if (!open) return null;

  const handleUpload = async () => {
    if (!picked || isUploading) return;
    setIsUploading(true);
    setError("");
    try {
      const { photo } = await uploadCustomerPhoto({ productId: product.id, file: picked.file, token });
      // The stored photo is private (no public link), so the capsule, cart and
      // checkout show a small preview kept in this browser instead.
      const thumb = await makeThumbnail(picked.src);
      setPersonalPhoto(product.id, { ...photo, thumb });
      setIsUploading(false);
      onUploaded?.(photo);
    } catch (uploadError) {
      setIsUploading(false);
      setError(uploadError.message || "Couldn't upload the photo. Please try again.");
    }
  };

  const isSmall = picked && Math.min(picked.naturalWidth, picked.naturalHeight) < SMALL_PHOTO_PX;

  return createPortal(
    <div className="photo-dialog-backdrop" role="presentation" onClick={() => !isUploading && onClose()}>
      <div
        ref={dialogRef}
        className="photo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-dialog-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="photo-dialog-head">
          <div>
            <p className="eyebrow">Your photo</p>
            <h3 id="photo-dialog-title">{product.name}</h3>
          </div>
          <button
            type="button"
            className="photo-dialog-close"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Choose a photo"
          onChange={(event) => {
            takeFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {picked ? (
          <div className="photo-dialog-preview">
            <img src={picked.src} alt="Your selected photo" />
          </div>
        ) : (
          <button
            type="button"
            className={`photo-dropzone${isDragOver ? " is-drag-over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragOver(false);
              takeFiles(event.dataTransfer.files);
            }}
          >
            <span className="photo-dropzone-icon" aria-hidden="true">
              <ImagePlus size={26} />
            </span>
            <strong>Choose a photo</strong>
            <span>or drag it here · paste works too</span>
            <span className="photo-dropzone-note">JPG, PNG or WebP · up to 10 MB</span>
          </button>
        )}

        {isSmall ? (
          <p className="photo-dialog-warn" role="note">
            This photo is quite small ({picked.naturalWidth}×{picked.naturalHeight}px) and may print a little soft. A
            larger original works best.
          </p>
        ) : null}
        {error ? (
          <p className="photo-dialog-error" role="alert">
            {error}
          </p>
        ) : null}

        {!picked ? (
          <ul className="photo-dialog-tips">
            <li>A clear, well-lit photo with faces fully in frame.</li>
            <li>The original from your phone or camera, not a screenshot.</li>
            {current ? <li>Uploading a new photo replaces the one you added before.</li> : null}
          </ul>
        ) : null}

        <div className="photo-dialog-actions">
          {picked ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              Choose another
            </button>
          ) : (
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={picked ? handleUpload : () => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Uploading…
              </>
            ) : picked ? (
              confirmLabel
            ) : (
              <>
                <Camera size={16} aria-hidden="true" /> Choose photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default PhotoUploadDialog;
