import { useEffect, useState } from "react";
import fallbackImage from "../assets/images/fallback-image.svg";

function ResponsiveImage({
  src,
  alt,
  className = "",
  aspectClassName = "ratio-square",
  priority = false,
}) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setIsLoaded(false);
  }, [src]);

  return (
    <div className={`image-shell ${aspectClassName}`}>
      {!isLoaded && <div className="image-skeleton" aria-hidden="true" />}
      <img
        src={imageSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        className={`responsive-image ${isLoaded ? "is-loaded" : ""} ${className}`.trim()}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (imageSrc !== fallbackImage) {
            setImageSrc(fallbackImage);
            setIsLoaded(false);
          } else {
            setIsLoaded(true);
          }
        }}
      />
    </div>
  );
}

export default ResponsiveImage;
