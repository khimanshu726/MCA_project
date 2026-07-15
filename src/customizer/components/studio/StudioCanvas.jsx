import { useCallback, useState } from "react";
import EditorStage from "../EditorStage.jsx";
import StudioViewControls from "./StudioViewControls.jsx";
import CanvasEmptyState from "./CanvasEmptyState.jsx";

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
  onUpload,
  onAddText,
  onBrowseTemplates,
}) {
  const [fitScale, setFitScale] = useState(1);
  const handleFitScaleChange = useCallback((next) => setFitScale(next), []);
  const isEmpty = side.layers.length === 0;

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
      />

      {isEmpty && (
        <CanvasEmptyState onUpload={onUpload} onAddText={onAddText} onBrowseTemplates={onBrowseTemplates} />
      )}

      <StudioViewControls
        zoom={ui.zoom}
        fitScale={fitScale}
        onZoomChange={actions.setZoom}
        showGrid={showGrid}
        onToggleGrid={onToggleGrid}
        showGuides={showGuides}
        onToggleGuides={onToggleGuides}
        showRulers={showRulers}
        onToggleRulers={onToggleRulers}
      />
    </div>
  );
}

export default StudioCanvas;
