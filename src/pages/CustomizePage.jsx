import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AddToCartButton from "../components/AddToCartButton";
import ResponsiveImage from "../components/ResponsiveImage";
import { getProductById, products } from "../data";

function CustomizePage() {
  const { productId } = useParams();
  const initialProduct = useMemo(() => getProductById(productId) ?? products[0], [productId]);
  const [selectedProductId, setSelectedProductId] = useState(initialProduct.id);
  const [uploadedImage, setUploadedImage] = useState("");

  const selectedProduct = useMemo(
    () => getProductById(selectedProductId) ?? products[0],
    [selectedProductId],
  );

  useEffect(() => {
    setSelectedProductId(initialProduct.id);
  }, [initialProduct.id]);

  useEffect(() => {
    return () => {
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage);
      }
    };
  }, [uploadedImage]);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }

    setUploadedImage(URL.createObjectURL(file));
  };

  return (
    <main className="page-stack">
      <section className="customize-layout">
        <article className="section-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Customization page</p>
              <h2>Upload a logo or design and preview it on the selected product.</h2>
            </div>
          </div>

          <div className="customize-controls">
            <label className="field-label" htmlFor="product-select">
              Product
            </label>
            <select id="product-select" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="design-upload">
              Upload logo or design
            </label>
            <input id="design-upload" type="file" accept="image/*" onChange={handleUpload} />

            {uploadedImage ? (
              <div className="upload-preview-card">
                <p className="eyebrow">Uploaded image preview</p>
                <ResponsiveImage
                  src={uploadedImage}
                  alt="Uploaded design preview"
                  className="upload-preview-image"
                  aspectClassName="ratio-square"
                />
              </div>
            ) : (
              <div className="upload-placeholder">
                <p>No upload yet. Choose an image to preview it on the product.</p>
              </div>
            )}
          </div>
        </article>

        <article className="section-panel product-preview-panel">
          <p className="eyebrow">Overlay preview</p>
          <div className="product-preview-stage">
            <ResponsiveImage
              src={selectedProduct.images[0]}
              alt={`${selectedProduct.name} preview`}
              className="product-preview-image"
              aspectClassName="ratio-product"
            />
            {uploadedImage ? (
              <img className="overlay-artwork" src={uploadedImage} alt="Uploaded artwork over product preview" loading="lazy" />
            ) : (
              <div className="overlay-placeholder">Upload image</div>
            )}
          </div>
          <p className="section-copy">
            Backend upload target reference: <code>uploads/</code>
          </p>
          <div className="action-row">
            <AddToCartButton product={selectedProduct} className="primary-button" idleLabel="Add customized item" />
            <Link className="secondary-button" to="/cart">
              View cart
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

export default CustomizePage;
