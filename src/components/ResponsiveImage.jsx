import { useEffect, useLayoutEffect, useRef, useState } from "react";
import fallbackImage from "../assets/images/fallback-image.svg";
import { getOptimizedImageUrl } from "../utils/imageUrl";
import { devWarn } from "../utils/logger";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Single source of truth for every product/asset image in the app. Renders
 * a fixed-aspect-ratio shell (so layout never shifts while the image
 * loads), a shimmer skeleton until it's ready, and falls back to a bundled
 * placeholder graphic if the image never loads — including a couple of
 * quick retries first, since most real-world failures here are transient
 * network blips rather than a genuinely broken URL.
 */
function ResponsiveImage({
  src,
  alt,
  className = "",
  aspectClassName = "ratio-square",
  priority = false,
  width,
}) {
  const resolvedSrc = getOptimizedImageUrl(src, { width });
  const [imageSrc, setImageSrc] = useState(resolvedSrc || fallbackImage);
  const [isLoaded, setIsLoaded] = useState(false);
  const retryCountRef = useRef(0);
  const imageNodeRef = useRef(null);

  // Only reset the fade when the source genuinely changes. This used to reset
  // unconditionally, which meant it also ran on mount — clobbering the
  // already-complete check below, since layout effects run before this one
  // within the same commit. Skipping the no-op mount pass keeps the two in
  // the right order without depending on effect declaration order.
  const previousSrcRef = useRef(resolvedSrc);

  useEffect(() => {
    if (!resolvedSrc) {
      // No src at all — there's nothing to request, so neither onLoad nor
      // onError will ever fire. Go straight to the fallback instead of
      // showing a skeleton that can never resolve.
      retryCountRef.current = 0;
      previousSrcRef.current = resolvedSrc;
      setImageSrc(fallbackImage);
      setIsLoaded(true);
      return;
    }

    if (previousSrcRef.current === resolvedSrc && imageSrc === resolvedSrc) {
      return;
    }

    retryCountRef.current = 0;
    previousSrcRef.current = resolvedSrc;
    setImageSrc(resolvedSrc);
    setIsLoaded(false);
    // imageSrc is deliberately not a dependency: it changes on every retry,
    // and reacting to that here would reset the retry counter mid-sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSrc]);

  /**
   * Catches images that finished loading before React attached `onLoad`.
   *
   * The fade-in is gated on that event, so an image that never fires it stays
   * at opacity 0 forever — downloaded, laid out, and invisible. That is not
   * hypothetical: it is exactly what the homepage hero did, on every repeat
   * visit. `priority` images are the ones at risk, because `loading="eager"`
   * starts the download during render, so a cached image can complete before
   * the listener exists. Lazy images escape it only by accident — they start
   * after hydration, by which point the handler is attached.
   *
   * useLayoutEffect, not useEffect: this runs before paint, so a cached image
   * appears immediately instead of flashing its skeleton for one frame. Keyed
   * on `imageSrc` so it re-checks after a src swap or a retry, where the same
   * race can happen again.
   */
  useLayoutEffect(() => {
    const node = imageNodeRef.current;

    if (node?.complete && node.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [imageSrc]);

  const handleLoad = () => setIsLoaded(true);

  const handleError = () => {
    if (imageSrc === fallbackImage) {
      // The fallback itself failed to load — stop here rather than loop.
      setIsLoaded(true);
      return;
    }

    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      const attempt = retryCountRef.current;
      window.setTimeout(() => {
        const separator = resolvedSrc.includes("?") ? "&" : "?";
        setImageSrc(`${resolvedSrc}${separator}retry=${attempt}`);
      }, RETRY_DELAY_MS * attempt);
      return;
    }

    devWarn("[ResponsiveImage] Giving up after retries, showing fallback", resolvedSrc);
    setImageSrc(fallbackImage);
  };

  return (
    <div className={`image-shell ${aspectClassName}`}>
      {!isLoaded && <div className="image-skeleton" aria-hidden="true" />}
      <img
        ref={imageNodeRef}
        src={imageSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className={`responsive-image ${isLoaded ? "is-loaded" : ""} ${className}`.trim()}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

export default ResponsiveImage;
