import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    retryCountRef.current = 0;

    if (!resolvedSrc) {
      // No src at all — there's nothing to request, so neither onLoad nor
      // onError will ever fire. Go straight to the fallback instead of
      // showing a skeleton that can never resolve.
      setImageSrc(fallbackImage);
      setIsLoaded(true);
      return;
    }

    setImageSrc(resolvedSrc);
    setIsLoaded(false);
  }, [resolvedSrc]);

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
