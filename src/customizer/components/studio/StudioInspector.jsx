import ArrangeSection from "./ArrangeSection.jsx";
import ImageContext from "./ImageContext.jsx";
import ShapeContext from "./ShapeContext.jsx";
import ProductContext from "./ProductContext.jsx";
import ProductPickerPanel from "./ProductPickerPanel.jsx";
import PropertyCard from "./PropertyCard.jsx";
import StudioHeading from "./StudioHeading.jsx";
import TextPanel from "../TextPanel.jsx";

/**
 * Contextual properties for whatever is selected — product settings when
 * nothing is. Named for its job, not its position: below lg it's the
 * content of a bottom sheet, not a right sidebar.
 *
 * Overlay rule: everything this panel opens (the product picker, option
 * listboxes, colour inputs) renders INSIDE it. Nothing here portals out or
 * uses position:fixed, so no inspector UI can land on the canvas.
 */
function StudioInspector({
  product,
  products,
  isProductListLoading,
  template,
  design,
  selectedLayer,
  actions,
  onReplaceImage,
  quantity,
  onQuantityChange,
  isPickingProduct,
  onOpenProductPicker,
  onCloseProductPicker,
  onSelectProduct,
  bare = false,
}) {
  // The picker is a view swap, not a popover — it owns the whole panel
  // while open, which is what keeps it inside its zone.
  if (isPickingProduct) {
    const picker = (
      <ProductPickerPanel
        products={products}
        value={product.id}
        isLoading={isProductListLoading}
        onSelect={onSelectProduct}
        onBack={onCloseProductPicker}
      />
    );

    if (bare) {
      return picker;
    }

    return (
      <aside aria-label="Choose product" className="flex h-full min-h-0 w-72 flex-col bg-white">
        {picker}
      </aside>
    );
  }

  let title = "Product";
  let body = (
    <ProductContext
      product={product}
      template={template}
      design={design}
      quantity={quantity}
      onQuantityChange={onQuantityChange}
      actions={actions}
      onOpenProductPicker={onOpenProductPicker}
    />
  );

  if (selectedLayer?.type === "image") {
    title = "Image";
    body = <ImageContext layer={selectedLayer} template={template} actions={actions} onReplaceImage={onReplaceImage} />;
  } else if (selectedLayer?.type === "text") {
    title = "Text";
    body = (
      <div className="flex flex-col gap-3">
        <TextPanel selectedLayer={selectedLayer} actions={actions} />
        <PropertyCard title="Arrange">
          <ArrangeSection layer={selectedLayer} actions={actions} />
        </PropertyCard>
      </div>
    );
  } else if (selectedLayer?.type === "shape" || selectedLayer?.type === "icon") {
    title = selectedLayer.type === "shape" ? "Shape" : "Graphic";
    body = <ShapeContext layer={selectedLayer} actions={actions} />;
  }

  if (bare) {
    return body;
  }

  return (
    <aside aria-label={`${title} properties`} className="flex h-full min-h-0 w-72 flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center px-4">
        <StudioHeading level={2} className="text-sm font-semibold text-ink-900">
          {title}
        </StudioHeading>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4">{body}</div>
    </aside>
  );
}

export default StudioInspector;
