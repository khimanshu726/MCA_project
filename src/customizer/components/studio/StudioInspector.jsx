import ArrangeSection from "./ArrangeSection.jsx";
import ImageContext from "./ImageContext.jsx";
import ShapeContext from "./ShapeContext.jsx";
import ProductContext from "./ProductContext.jsx";
import PropertyCard from "./PropertyCard.jsx";
import TextPanel from "../TextPanel.jsx";

/**
 * Contextual properties for whatever is selected — product settings when
 * nothing is. Named for its job, not its position: below lg it's the
 * content of a bottom sheet, not a right sidebar.
 */
function StudioInspector({
  product,
  template,
  design,
  selectedLayer,
  actions,
  onReplaceImage,
  quantity,
  onQuantityChange,
  productSelector,
  bare = false,
}) {
  let title = "Product";
  let body = (
    <ProductContext
      product={product}
      template={template}
      design={design}
      quantity={quantity}
      onQuantityChange={onQuantityChange}
      actions={actions}
      productSelector={productSelector}
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
      <div className="flex h-10 shrink-0 items-center px-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{body}</div>
    </aside>
  );
}

export default StudioInspector;
