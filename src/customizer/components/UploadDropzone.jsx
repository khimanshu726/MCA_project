import { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const readImage = (file) =>
  new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () =>
      resolve({ src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, file });
    image.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error("That file couldn't be read as an image."));
    };
    image.src = src;
  });

/**
 * Shared type/size gate, so click, drop, and paste can't drift apart.
 * Returns `{images, error}` rather than throwing — every caller wants to
 * surface the message, not crash.
 */
export async function readImageFiles(fileList) {
  const valid = [];
  let error = "";

  for (const file of [...fileList]) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      error = "Only PNG, JPG, and WebP images are supported.";
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      error = "Images must be 10 MB or smaller.";
      continue;
    }
    valid.push(file);
  }

  if (valid.length === 0) {
    return { images: [], error };
  }

  try {
    return { images: await Promise.all(valid.map(readImage)), error };
  } catch (readError) {
    return { images: [], error: readError.message };
  }
}

/**
 * Artwork intake: click or drag-and-drop. Presentational by design —
 * paste-from-clipboard is owned by DesignStudio, because this component
 * only mounts while the Uploads panel is open and a window listener living
 * here meant paste silently stopped working on every other panel.
 */
function UploadDropzone({ onImagesReady, isBusy = false }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");

  const processFiles = useCallback(
    async (fileList) => {
      setError("");
      const { images, error: readError } = await readImageFiles(fileList);
      if (readError) {
        setError(readError);
      }
      if (images.length > 0) {
        onImagesReady(images);
      }
    },
    [onImagesReady],
  );

  return (
    <div>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          processFiles(event.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition ${
          isDragOver ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-ink-50 hover:border-ink-400 hover:bg-ink-100"
        } ${isBusy ? "opacity-60" : ""}`}
      >
        {isBusy ? (
          <Loader2 size={20} className="animate-spin text-ink-500" aria-hidden="true" />
        ) : (
          <ImagePlus size={20} className="text-ink-500" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-ink-800">
          {isBusy ? "Adding your image…" : "Upload artwork"}
        </span>
        <span className="text-xs leading-relaxed text-ink-400">Click, drop, or paste · PNG, JPG, WebP · 10 MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        aria-label="Upload artwork"
        onChange={(event) => {
          processFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {error && <p className="mt-2 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export default UploadDropzone;
