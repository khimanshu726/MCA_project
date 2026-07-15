import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import LayerView, { layerBoxStyle, textLayerStyle } from "./LayerView.jsx";
import SelectionFrame from "./SelectionFrame.jsx";
import StageGuides from "./StageGuides.jsx";
import StageRulers from "./StageRulers.jsx";
import { getCanvasSize } from "../templates.js";
import { clamp, resizeLayer, rotatePoint, rotationFromPointer, snapCenter, snapRotation } from "../engine/geometry.js";
import { measureTextLayerHeight } from "../engine/textMetrics.js";

const STAGE_PADDING = 48;
const SNAP_THRESHOLD_PX = 6;

const backgroundCss = (background) => {
  if (!background) {
    return { background: "#ffffff" };
  }
  if (background.type === "gradient") {
    return {
      background: `linear-gradient(${background.angle ?? 135}deg, ${background.value}, ${background.value2 ?? background.value})`,
    };
  }
  return { background: background.value };
};

/**
 * The interactive canvas: renders the active side at screen scale, clips
 * artwork to the printable canvas, and owns every pointer interaction —
 * move (with snapping), resize, rotate, crop pan, pinch zoom, inline text
 * editing, and the keyboard shortcut map.
 */
function EditorStage({
  template,
  side,
  ui,
  selectedLayer,
  actions,
  nudgeSelected,
  canUndoNow,
  canRedoNow,
  showGrid = false,
  showRulers = false,
  showGuides = true,
  onFitScaleChange,
}) {
  const containerRef = useRef(null);
  const surfaceRef = useRef(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);
  const cropStartRef = useRef(null);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [snapGuides, setSnapGuides] = useState([]);
  const [editingLayerId, setEditingLayerId] = useState(null);

  const canvas = getCanvasSize(template);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fitWidthRaw = (containerSize.width - STAGE_PADDING) / canvas.width;
  const rawFitScale = Math.max(0.05, Math.min(fitWidthRaw, (containerSize.height - STAGE_PADDING) / canvas.height));
  const fitScale = Number.isFinite(rawFitScale) && rawFitScale > 0 ? rawFitScale : 1;
  const fitWidthScale = Number.isFinite(fitWidthRaw) && fitWidthRaw > 0 ? fitWidthRaw : 1;
  const scale = fitScale * ui.zoom;

  // Both reported up so the view controls can label presets and show a true
  // percentage. `ui.zoom` is a multiplier on fit, not an absolute, so
  // neither number can be derived outside this component.
  useEffect(() => {
    onFitScaleChange?.({ fitScale, fitWidthScale });
  }, [fitScale, fitWidthScale, onFitScaleChange]);

  const screenToMm = useCallback(
    (clientX, clientY) => {
      const rect = surfaceRef.current.getBoundingClientRect();
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    },
    [scale],
  );

  // A fresh array every pointermove would defeat React's bail-out and force
  // StageGuides to rebuild its grid (~248 <line> elements on a banner) on
  // every frame of a drag. Only set when the guide set actually changes.
  const setSnapGuidesIfChanged = useCallback((next) => {
    setSnapGuides((current) =>
      current.length === next.length && current.every((guide, index) => guide === next[index]) ? current : next,
    );
  }, []);

  const stopDrag = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null;
      setSnapGuides([]);
      actions.endTransaction();
    }
  }, [actions]);

  const handlePointerMove = useCallback(
    (event) => {
      // Two-finger pinch overrides any in-flight layer drag.
      if (pinchRef.current) {
        pinchRef.current.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...pinchRef.current.points.values()];
        if (points.length >= 2) {
          const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          if (pinchRef.current.startDistance) {
            const ratio = distance / pinchRef.current.startDistance;
            actions.setZoom(pinchRef.current.startZoom * ratio);
          } else {
            pinchRef.current.startDistance = distance;
            pinchRef.current.startZoom = ui.zoom;
          }
        }
        return;
      }

      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const pointer = screenToMm(event.clientX, event.clientY);
      const start = drag.startLayer;

      if (drag.mode === "move") {
        const proposed = {
          x: start.x + (pointer.x - drag.startPointer.x),
          y: start.y + (pointer.y - drag.startPointer.y),
        };

        if (event.altKey) {
          setSnapGuidesIfChanged([]);
          actions.updateLayer(start.id, proposed, { transient: true });
        } else {
          const snapped = snapCenter(start, proposed, template, SNAP_THRESHOLD_PX / scale);
          setSnapGuidesIfChanged(snapped.guides);
          actions.updateLayer(start.id, { x: snapped.x, y: snapped.y }, { transient: true });
        }
      } else if (drag.mode === "resize") {
        const resized = resizeLayer(start, drag.handle, pointer, { keepAspect: event.shiftKey });
        const patch = { x: resized.x, y: resized.y, width: resized.width, height: resized.height };
        if (start.type === "text") {
          patch.height = measureTextLayerHeight({ ...start, ...patch });
        }
        actions.updateLayer(start.id, patch, { transient: true });
      } else if (drag.mode === "rotate") {
        let angle = rotationFromPointer(start, pointer);
        angle = event.shiftKey ? Math.round(angle / 15) * 15 : snapRotation(angle);
        actions.updateLayer(start.id, { rotation: angle % 360 }, { transient: true });
      } else if (drag.mode === "crop-pan") {
        const rawDelta = { x: pointer.x - drag.startPointer.x, y: pointer.y - drag.startPointer.y };
        const local = rotatePoint(rawDelta, { x: 0, y: 0 }, -(start.rotation || 0));
        const crop = start.crop;

        const displayW = start.width / crop.width;
        const displayH = start.height / crop.height;
        const deltaFx = (local.x / displayW) * (start.flipH ? 1 : -1);
        const deltaFy = (local.y / displayH) * (start.flipV ? 1 : -1);

        actions.updateLayer(
          start.id,
          {
            crop: {
              ...crop,
              x: clamp(crop.x + deltaFx, 0, 1 - crop.width),
              y: clamp(crop.y + deltaFy, 0, 1 - crop.height),
            },
          },
          { transient: true },
        );
      }
    },
    [actions, screenToMm, scale, template, ui.zoom],
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (pinchRef.current) {
        pinchRef.current.points.delete(event.pointerId);
        if (pinchRef.current.points.size < 2) {
          pinchRef.current = null;
        }
      }
      stopDrag();
    },
    [stopDrag],
  );

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const beginDrag = (event, layer, mode, handle = null) => {
    event.preventDefault();
    event.stopPropagation();

    // Second touch converts a drag into a pinch.
    if (event.pointerType === "touch" && dragRef.current) {
      actions.endTransaction();
      dragRef.current = null;
      pinchRef.current = { points: new Map([[event.pointerId, { x: event.clientX, y: event.clientY }]]) };
      return;
    }

    actions.selectLayer(layer.id);
    if (layer.locked) {
      return;
    }

    actions.beginTransaction();
    dragRef.current = {
      mode,
      handle,
      startPointer: screenToMm(event.clientX, event.clientY),
      startLayer: layer,
    };
  };

  const handleLayerPointerDown = (event, layer) => {
    if (editingLayerId === layer.id) {
      return;
    }
    const mode = ui.cropLayerId === layer.id ? "crop-pan" : "move";
    beginDrag(event, layer, mode);
  };

  const handleStagePointerDown = (event) => {
    if (event.target === surfaceRef.current || event.target.dataset.stagebg !== undefined) {
      if (ui.cropLayerId) {
        applyCrop();
      }
      actions.selectLayer(null);
      setEditingLayerId(null);
    }
  };

  const startCrop = (layer) => {
    cropStartRef.current = layer.crop;
    actions.beginTransaction();
    actions.setCropMode(layer.id);
  };

  const applyCrop = () => {
    actions.endTransaction();
    actions.setCropMode(null);
    cropStartRef.current = null;
  };

  const cancelCrop = () => {
    actions.cancelTransaction();
    actions.setCropMode(null);
    cropStartRef.current = null;
  };

  const handleLayerDoubleClick = (layer) => {
    if (layer.locked) {
      return;
    }
    if (layer.type === "text") {
      actions.beginTransaction();
      setEditingLayerId(layer.id);
    } else if (layer.type === "image") {
      startCrop(layer);
    }
  };

  const commitTextEditing = () => {
    setEditingLayerId(null);
    actions.endTransaction();
  };

  const handleCropZoom = (layer, zoomValue) => {
    const width = 1 / zoomValue;
    const height = 1 / zoomValue;
    const centerX = layer.crop.x + layer.crop.width / 2;
    const centerY = layer.crop.y + layer.crop.height / 2;

    actions.updateLayer(
      layer.id,
      {
        crop: {
          x: clamp(centerX - width / 2, 0, 1 - width),
          y: clamp(centerY - height / 2, 0, 1 - height),
          width,
          height,
        },
      },
      { transient: true },
    );
  };

  // Keyboard shortcuts. Skipped while the focus is in a form control so the
  // side panels keep native editing behaviour.
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      const isFormField =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;

      const isModifier = event.ctrlKey || event.metaKey;

      if (isModifier && event.key.toLowerCase() === "z" && !isFormField) {
        event.preventDefault();
        if (event.shiftKey) {
          if (canRedoNow) actions.redo();
        } else if (canUndoNow) {
          actions.undo();
        }
        return;
      }

      if (isModifier && event.key.toLowerCase() === "y" && !isFormField) {
        event.preventDefault();
        if (canRedoNow) actions.redo();
        return;
      }

      if (isFormField) {
        return;
      }

      if (isModifier && event.key.toLowerCase() === "d" && selectedLayer) {
        event.preventDefault();
        actions.duplicateLayer(selectedLayer.id);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedLayer && !selectedLayer.locked) {
        event.preventDefault();
        actions.removeLayer(selectedLayer.id);
        return;
      }

      if (event.key === "Escape") {
        if (ui.cropLayerId) {
          cancelCrop();
        } else if (editingLayerId) {
          commitTextEditing();
        } else {
          actions.selectLayer(null);
        }
        return;
      }

      const step = event.shiftKey ? 5 : 1;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, -step);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, step);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, selectedLayer, editingLayerId, ui.cropLayerId, nudgeSelected, canUndoNow, canRedoNow]);

  const croppingLayer = ui.cropLayerId ? side.layers.find((layer) => layer.id === ui.cropLayerId) : null;

  return (
    <div
      ref={containerRef}
      data-stagebg
      onPointerDown={handleStagePointerDown}
      className="scrollbar-thin relative flex h-full w-full items-center justify-center overflow-auto"
      // scrollbar-gutter breaks a feedback loop: zooming in overflows the
      // container, a scrollbar appears, the content box narrows, fitScale
      // recomputes — so a zoom target derived from fitScale (like "Actual
      // size") lands ~2% off and the artboard jumps. Reserving the gutter
      // keeps the measured box constant at every zoom.
      style={{ touchAction: "none", scrollbarGutter: "stable both-edges" }}
    >
      <div
        ref={surfaceRef}
        className="relative shrink-0 shadow-overlay"
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
          margin: STAGE_PADDING / 2,
          ...backgroundCss(side.background),
        }}
      >
        {side.layers.map((layer) => (
          <div
            key={layer.id}
            role="button"
            tabIndex={-1}
            aria-label={`${layer.name} layer`}
            onPointerDown={(event) => handleLayerPointerDown(event, layer)}
            onDoubleClick={() => handleLayerDoubleClick(layer)}
            style={{
              ...layerBoxStyle(layer, scale),
              cursor: layer.locked ? "default" : ui.cropLayerId === layer.id ? "grab" : "move",
              touchAction: "none",
              zIndex: 10,
              outline: "none",
            }}
          >
            {editingLayerId === layer.id && layer.type === "text" ? (
              <textarea
                autoFocus
                value={layer.text}
                aria-label="Edit text"
                onChange={(event) => {
                  const patch = { text: event.target.value };
                  patch.height = measureTextLayerHeight({ ...layer, ...patch });
                  actions.updateLayer(layer.id, patch, { transient: true });
                }}
                onBlur={commitTextEditing}
                onPointerDown={(event) => event.stopPropagation()}
                style={{
                  ...textLayerStyle(layer, scale),
                  height: "100%",
                  background: "transparent",
                  border: "1px dashed rgba(184,70,29,0.6)",
                  outline: "none",
                  resize: "none",
                  overflow: "hidden",
                  userSelect: "text",
                }}
              />
            ) : (
              <LayerView layer={layer} scale={scale} />
            )}
          </div>
        ))}

        <StageGuides
          template={template}
          scale={scale}
          snapGuides={snapGuides}
          showGrid={showGrid}
          showGuides={showGuides}
        />
        {showRulers && <StageRulers template={template} scale={scale} />}

        {selectedLayer && !selectedLayer.hidden && (
          <SelectionFrame
            layer={selectedLayer}
            scale={scale}
            isCropping={ui.cropLayerId === selectedLayer.id}
            onHandlePointerDown={(event, handle) => beginDrag(event, selectedLayer, "resize", handle)}
            onRotatePointerDown={(event) => beginDrag(event, selectedLayer, "rotate")}
          />
        )}
      </div>

      {croppingLayer && (
        <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-overlay">
          <span className="text-xs font-medium text-ink-600">Crop</span>
          <input
            type="range"
            min="1"
            max="4"
            step="0.05"
            aria-label="Crop zoom"
            value={1 / croppingLayer.crop.width}
            onChange={(event) => handleCropZoom(croppingLayer, Number(event.target.value))}
            className="w-36 accent-brand-500"
          />
          <button
            type="button"
            onClick={applyCrop}
            className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <Check size={12} aria-hidden="true" /> Apply
          </button>
          <button
            type="button"
            onClick={cancelCrop}
            className="flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <X size={12} aria-hidden="true" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default EditorStage;
