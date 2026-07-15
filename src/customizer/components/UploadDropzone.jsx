import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

const readImage = (file) =>
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
 * Artwork intake: click, drag-and-drop, or paste from the clipboard.
 * Multiple files are accepted in one drop; each becomes its own layer via
 * onImagesReady. Validation (type/size) happens here so every entry path
 * shares the same rules.
 */
function UploadDropzone({ onImagesReady, isBusy = false }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState("");

  const processFiles = useCallback(
    async (fileList) => {
      setError("");
      const files = [...fileList];
      const valid = [];

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError("Only PNG, JPG, and WebP images are supported.");
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          setError("Images must be 10 MB or smaller.");
          continue;
        }
        valid.push(file);
      }

      if (valid.length === 0) {
        return;
      }

      try {
        const images = await Promise.all(valid.map(readImage));
        onImagesReady(images);
      } catch (readError) {
        setError(readError.message);
      }
    },
    [onImagesReady],
  );

  // Paste-from-clipboard support (screenshots, copied images).
  useEffect(() => {
    const onPaste = (event) => {
      const items = [...(event.clipboardData?.items || [])];
      const imageFiles = items
        .filter((item) => item.kind === "file" && ACCEPTED_TYPES.includes(item.type))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (imageFiles.length > 0) {
        event.preventDefault();
        processFiles(imageFiles);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [processFiles]);

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
        className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          isDragOver ? "border-brand-500 bg-brand-50/60" : "border-ink-300 bg-white hover:border-brand-400"
        } ${isBusy ? "opacity-60" : ""}`}
      >
        {isBusy ? (
          <Loader2 size={22} className="animate-spin text-brand-500" aria-hidden="true" />
        ) : (
          <ImagePlus size={22} className="text-brand-500" aria-hidden="true" />
        )}
        <span className="text-sm font-medium text-ink-800">
          {isBusy ? "Adding your image…" : "Upload artwork"}
        </span>
        <span className="text-xs text-ink-500">Click, drag &amp; drop, or paste · PNG, JPG, WebP · up to 10 MB</span>
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
