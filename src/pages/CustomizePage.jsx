import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AddToCartButton from "../components/AddToCartButton";
import ResponsiveImage from "../components/ResponsiveImage";
import ProductSelector from "../components/ProductSelector";
import { useProducts } from "../hooks/useProducts";
import { useProduct } from "../hooks/useProduct";

function CustomizePage() {
  const { productId } = useParams();
  const { data: productsData, isLoading: isListLoading } = useProducts({ limit: 100 });
  const items = productsData?.items ?? [];

  const [selectedProductId, setSelectedProductId] = useState(productId || "");
  const [uploadedImage, setUploadedImage] = useState("");

  useEffect(() => {
    if (productId) {
      setSelectedProductId(productId);
    } else if (!selectedProductId && items.length > 0) {
      setSelectedProductId(items[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, items]);

  const { data: selectedProduct, isLoading: isProductLoading } = useProduct(selectedProductId);

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

  if (isListLoading || (selectedProductId && isProductLoading && !selectedProduct)) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <p className="section-copy">Loading customization tools&hellip;</p>
        </section>
      </main>
    );
  }

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
            <ProductSelector
              id="product-select"
              label="Product"
              products={items}
              value={selectedProductId}
              onChange={setSelectedProductId}
              isLoading={isListLoading}
            />

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
          {selectedProduct ? (
            <>
              <div className="product-preview-stage">
                <ResponsiveImage
                  src={selectedProduct.images[0]}
                  alt={`${selectedProduct.name} preview`}
                  className="product-preview-image"
                  aspectClassName="ratio-product"
                />
                {uploadedImage ? (
                  <img
                    className="overlay-artwork"
                    src={uploadedImage}
                    alt="Uploaded artwork over product preview"
                    loading="lazy"
                  />
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
            </>
          ) : (
            <p className="section-copy">Select a product to preview.</p>
          )}
        </article>
      </section>
    </main>
  );
}

export default CustomizePage;
