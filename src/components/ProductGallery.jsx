import ResponsiveImage from "./ResponsiveImage";

function ProductGallery({ images, productName, activeImage, onSelect }) {
  return (
    <section className="gallery-panel" aria-label={`${productName} image gallery`}>
      <div
        className="gallery-thumbs-column"
        role="list"
        aria-label="Product thumbnails"
      >
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            role="listitem"
            className={`gallery-thumb ${activeImage === image ? "active" : ""}`}
            onClick={() => onSelect(image)}
            aria-label={`Show ${productName} image ${index + 1}`}
            aria-selected={activeImage === image}
          >
            <ResponsiveImage
              src={image}
              alt={`${productName} thumbnail ${index + 1}`}
              className="thumb-image"
              aspectClassName="ratio-square"
              width={82}
            />
          </button>
        ))}
      </div>

      <div className="gallery-main-wrapper">
        <ResponsiveImage
          src={activeImage}
          alt={`${productName} large preview`}
          className="gallery-image"
          aspectClassName="ratio-gallery"
          priority
          width={800}
        />
      </div>
    </section>
  );
}

export default ProductGallery;
