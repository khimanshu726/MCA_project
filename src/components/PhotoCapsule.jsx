import { useState } from "react";
import { Camera } from "lucide-react";
import PhotoUploadDialog from "./PhotoUploadDialog";
import { usePersonalPhoto } from "../utils/personalPhotos";
import { API_ASSET_BASE_URL } from "../lib/api";

// Cloudinary gives full URLs; local development stores under /uploads.
export const photoSrc = (url) => (!url || /^https?:\/\//i.test(url) ? url : `${API_ASSET_BASE_URL}${url}`);

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
        {photo ? (
          <img className="photo-capsule-thumb" src={photoSrc(photo.url)} alt="" />
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
