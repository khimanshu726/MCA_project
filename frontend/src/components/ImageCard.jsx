import { Link } from "react-router-dom";
import ResponsiveImage from "./ResponsiveImage";

function ImageCard({ imageSrc, imageAlt, title, description, to }) {
  return (
    <Link className="image-card image-card-link" to={to}>
      <ResponsiveImage src={imageSrc} alt={imageAlt} className="card-image" aspectClassName="ratio-card" />
      <div className="card-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
}

export default ImageCard;
