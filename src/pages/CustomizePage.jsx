import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ProductSelector from "../components/ProductSelector";
import DesignStudio from "../customizer/components/DesignStudio.jsx";
import { getTemplateForProduct } from "../customizer/templates.js";
import { loadDraft } from "../customizer/hooks/useAutosave.js";
import { getDesignById } from "../api/designsApi.js";
import { useProducts } from "../hooks/useProducts";
import { useProduct } from "../hooks/useProduct";
import { useUserAuth } from "../context/UserAuthContext";

/**
 * Customization studio host: product picker on top, the design studio
 * below. Designs can arrive three ways — fresh, recovered from the
 * autosave draft, or hydrated from a saved "My Designs" document
 * (?design=<id>).
 */
function CustomizePage() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useUserAuth();

  const designId = searchParams.get("design");

  const { data: productsData, isLoading: isListLoading } = useProducts({ limit: 100 });
  const items = productsData?.items ?? [];

  const [selectedProductId, setSelectedProductId] = useState(productId || "");

  useEffect(() => {
    if (productId) {
      setSelectedProductId(productId);
    } else if (!selectedProductId && items.length > 0) {
      setSelectedProductId(items[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, items]);

  const { data: selectedProduct, isLoading: isProductLoading } = useProduct(selectedProductId);

  const savedDesignQuery = useQuery({
    queryKey: ["design", designId],
    queryFn: () => getDesignById(token, designId),
    enabled: Boolean(designId && isAuthenticated && token),
  });

  const handleProductChange = (nextId) => {
    setSelectedProductId(nextId);
    // Drop any ?design= param — a saved design belongs to its product.
    navigate(`/customize/${nextId}`, { replace: true });
  };

  if (isListLoading || (selectedProductId && isProductLoading && !selectedProduct)) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <p className="section-copy">Loading the design studio&hellip;</p>
        </section>
      </main>
    );
  }

  if (designId && savedDesignQuery.isLoading) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <p className="section-copy">Opening your saved design&hellip;</p>
        </section>
      </main>
    );
  }

  const template = getTemplateForProduct(selectedProduct);
  const savedDesign = savedDesignQuery.data || null;
  const draft = !savedDesign && selectedProduct ? loadDraft(selectedProduct.id) : null;
  const initialDesign = savedDesign?.state || draft?.design || null;

  return (
    <main className="page-stack">
      <section className="section-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Customization studio</p>
            <h2>Design it exactly how you want it printed.</h2>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <ProductSelector
              id="product-select"
              label="Product"
              products={items}
              value={selectedProductId}
              onChange={handleProductChange}
              isLoading={isListLoading}
            />
          </div>
          {isAuthenticated && (
            <Link to="/account/designs" className="text-sm font-semibold text-brand-600 hover:underline">
              My designs →
            </Link>
          )}
        </div>

        {selectedProduct ? (
          <DesignStudio
            key={`${selectedProduct.id}:${savedDesign?.id || "new"}`}
            product={selectedProduct}
            template={template}
            initialDesign={initialDesign}
            initialDesignId={savedDesign?.id || null}
            recoveredDraft={Boolean(draft && !savedDesign)}
          />
        ) : (
          <p className="section-copy">Select a product to start designing.</p>
        )}
      </section>
    </main>
  );
}

export default CustomizePage;
