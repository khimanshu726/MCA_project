import { useState } from "react";
import { Camera, Check } from "lucide-react";
import PhotoUploadDialog from "./PhotoUploadDialog";
import { usePersonalPhoto } from "../utils/personalPhotos";

/**
 * The "Upload photo" capsule on a personalised product. Before an upload it
 * invites one; after, it shows a thumbnail of the customer's photo with
 * "Change". Opens the upload dialog either way.
 */
function PhotoCapsule({ product, size = "sm", className = "" }) {
  const photo = usePersonalPhoto(product.id);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`photo-capsule photo-capsule-${size}${photo ? " has-photo" : ""} ${className}`.trim()}
        onClick={() => setIsOpen(true)}
        aria-label={photo ? `Change your photo for ${product.name}` : `Upload your photo for ${product.name}`}
      >
        {/* The uploaded photo is private on the server; this is the small
            preview kept in the customer's own browser. */}
        {photo?.thumb ? (
          <img className="photo-capsule-thumb" src={photo.thumb} alt="" />
        ) : photo ? (
          <span className="photo-capsule-icon photo-capsule-done" aria-hidden="true">
            <Check size={size === "lg" ? 17 : 14} />
          </span>
        ) : (
          <span className="photo-capsule-icon" aria-hidden="true">
            <Camera size={size === "lg" ? 17 : 14} />
          </span>
        )}
        <span className="photo-capsule-text">
          {photo ? (
            <>
              Photo added <span className="photo-capsule-change">· Change</span>
            </>
          ) : (
            <>
              Upload <span className="photo-capsule-long">your </span>photo
            </>
          )}
        </span>
      </button>
      <PhotoUploadDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        product={product}
        onUploaded={() => setIsOpen(false)}
      />
    </>
  );
}

export default PhotoCapsule;
