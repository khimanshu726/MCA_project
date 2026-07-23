import { useCallback, useState } from "react";
import EditorStage from "../EditorStage.jsx";
import StudioViewControls from "./StudioViewControls.jsx";
import StudioObjectBar from "./StudioObjectBar.jsx";

/**
 * The workspace: neutral backdrop + the interactive stage + floating view
 * controls.
 *
 * The backdrop is `ink-100` (neutral) rather than the storefront's warm
 * bone. This is a deliberate break: a warm surround shifts perception of
 * the artboard's colours (simultaneous contrast), and customers here are
 * making colour decisions they'll pay to have physically printed. Bone
 * remains the storefront's identity; the studio is the tool.
 */
function StudioCanvas({
  template,
  side,
  ui,
  selectedLayer,
  actions,
  nudgeSelected,
  canUndo,
  canRedo,
  showGrid,
  onToggleGrid,
  showGuides,
  onToggleGuides,
  showRulers,
  onToggleRulers,
}) {
  const [fit, setFit] = useState({ fitScale: 1, fitWidthScale: 1 });
  const handleFitScaleChange = useCallback(
    (next) => setFit((current) => (current.fitScale === next.fitScale && current.fitWidthScale === next.fitWidthScale ? current : next)),
    [],
  );

  // While a layer is being dragged/resized/rotated/pinched, the floating
  // overlays fade out so the canvas and the object have the screen to
  // themselves (spec: "maximum working space"), then fade back on release.
  const [isInteracting, setIsInteracting] = useState(false);

  return (
    <div className="relative h-full w-full bg-ink-100">
      <EditorStage
        template={template}
        side={side}
        ui={ui}
        selectedLayer={selectedLayer}
        actions={actions}
        nudgeSelected={nudgeSelected}
        canUndoNow={canUndo}
        canRedoNow={canRedo}
        showGrid={showGrid}
        showGuides={showGuides}
        showRulers={showRulers}
        onFitScaleChange={handleFitScaleChange}
        onInteractingChange={setIsInteracting}
      />

      {/* Floating overlays fade out during direct manipulation. This wrapper
          generates no box of its own (its children are absolutely positioned
          against the canvas), so it only carries the shared opacity/fade. */}
      <div className={`opacity-100 transition-opacity duration-200 ${isInteracting ? "max-lg:pointer-events-none max-lg:opacity-0" : ""}`}>
        <StudioViewControls
          zoom={ui.zoom}
          fitScale={fit.fitScale}
          fitWidthScale={fit.fitWidthScale}
          onZoomChange={actions.setZoom}
          showGrid={showGrid}
          onToggleGrid={onToggleGrid}
          showGuides={showGuides}
          onToggleGuides={onToggleGuides}
          showRulers={showRulers}
          onToggleRulers={onToggleRulers}
        />

        {/* Touch quick-actions for the selected object (mobile only). Hidden
            while cropping, which owns its own bottom bar. */}
        {selectedLayer && !ui.cropLayerId ? <StudioObjectBar layer={selectedLayer} actions={actions} /> : null}
      </div>
    </div>
  );
}

export default StudioCanvas;
