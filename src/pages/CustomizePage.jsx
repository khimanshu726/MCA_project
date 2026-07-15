import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
 * Design Studio host. The studio fills the viewport below the site header
 * — a workspace, not a marketing page. Designs arrive three ways: fresh,
 * recovered from the autosave draft, or hydrated from a saved
 * "My Designs" document (?design=<id>).
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

  if (!selectedProduct) {
    return (
      <main className="page-stack">
        <section className="section-panel">
          <p className="section-copy">Select a product to start designing.</p>
        </section>
      </main>
    );
  }

  // No wrapper and no viewport math: StudioShell claims the full dvh itself.
  // The old `calc(100dvh - 150px)` guessed at the storefront chrome and
  // guessed wrong (promo + header measure 206px), so the editor overflowed
  // into the footer.
  return (
    <DesignStudio
      key={`${selectedProduct.id}:${savedDesign?.id || "new"}`}
      product={selectedProduct}
      template={template}
      initialDesign={initialDesign}
      initialDesignId={savedDesign?.id || null}
      initialDesignName={savedDesign?.name || null}
      recoveredDraft={Boolean(draft && !savedDesign)}
      productSelector={
        <ProductSelector
          id="product-select"
          products={items}
          value={selectedProductId}
          onChange={handleProductChange}
          isLoading={isListLoading}
          compact
        />
      }
    />
  );
}

export default CustomizePage;
