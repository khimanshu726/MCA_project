import ResponsiveImage from "./ResponsiveImage";

function ImageCard({ imageSrc, imageAlt, title, description }) {
  return (
    <article className="image-card">
      <ResponsiveImage src={imageSrc} alt={imageAlt} className="card-image" aspectClassName="ratio-card" />
      <div className="card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}

export default ImageCard;
