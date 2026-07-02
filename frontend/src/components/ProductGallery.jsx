import ResponsiveImage from "./ResponsiveImage";

function ProductGallery({ images, productName, activeImage, onSelect }) {
  return (
    <section className="section-panel gallery-panel">
      <ResponsiveImage
        src={activeImage}
        alt={`${productName} large preview`}
        className="gallery-image"
        aspectClassName="ratio-gallery"
        priority
      />

      <div className="gallery-strip">
        {images.map((image, index) => (
          <button
            key={image}
            type="button"
            className={`gallery-thumb ${activeImage === image ? "active" : ""}`}
            onClick={() => onSelect(image)}
            aria-label={`Show ${productName} image ${index + 1}`}
          >
            <ResponsiveImage
              src={image}
              alt={`${productName} thumbnail ${index + 1}`}
              className="thumb-image"
              aspectClassName="ratio-thumb"
            />
          </button>
        ))}
      </div>
    </section>
  );
}

export default ProductGallery;
