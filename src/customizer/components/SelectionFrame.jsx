import { RotateCw } from "lucide-react";
import { HANDLES } from "../engine/geometry.js";

const HANDLE_POSITIONS = {
  nw: { left: 0, top: 0 },
  n: { left: "50%", top: 0 },
  ne: { left: "100%", top: 0 },
  e: { left: "100%", top: "50%" },
  se: { left: "100%", top: "100%" },
  s: { left: "50%", top: "100%" },
  sw: { left: 0, top: "100%" },
  w: { left: 0, top: "50%" },
};

const HANDLE_CURSORS = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

/**
 * Selection chrome for the active layer: brand-colored border, 8 resize
 * handles, a rotate grip above the box, and a live size/rotation badge.
 * Text layers only expose horizontal handles (height follows content).
 */
function SelectionFrame({ layer, scale, onHandlePointerDown, onRotatePointerDown, isCropping }) {
  const handles = layer.type === "text" ? ["e", "w"] : HANDLES;

  return (
    <div
      style={{
        position: "absolute",
        left: (layer.x - layer.width / 2) * scale,
        top: (layer.y - layer.height / 2) * scale,
        width: layer.width * scale,
        height: layer.height * scale,
        transform: `rotate(${layer.rotation || 0}deg)`,
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      <div
        className={`absolute inset-0 border-2 ${isCropping ? "border-gold-500" : "border-brand-500"}`}
        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.85)" }}
      />

      {!layer.locked &&
        handles.map((handle) => (
          <button
            key={handle}
            type="button"
            aria-label={`Resize ${handle}`}
            data-handle={handle}
            onPointerDown={(event) => onHandlePointerDown(event, handle)}
            className="absolute size-3 rounded-full border border-brand-500 bg-white shadow-sm"
            style={{
              ...HANDLE_POSITIONS[handle],
              transform: "translate(-50%, -50%)",
              cursor: HANDLE_CURSORS[handle],
              pointerEvents: "auto",
              touchAction: "none",
            }}
          />
        ))}

      {!layer.locked && !isCropping && (
        <button
          type="button"
          aria-label="Rotate layer"
          onPointerDown={onRotatePointerDown}
          className="absolute flex size-6 items-center justify-center rounded-full border border-brand-500 bg-white text-brand-600 shadow-sm"
          style={{
            left: "50%",
            top: -28,
            transform: "translateX(-50%)",
            cursor: "grab",
            pointerEvents: "auto",
            touchAction: "none",
          }}
        >
          <RotateCw size={13} aria-hidden="true" />
        </button>
      )}

      <span
        className="absolute left-1/2 rounded-md bg-ink-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white"
        style={{ top: "100%", marginTop: 6, transform: "translateX(-50%)", whiteSpace: "nowrap" }}
      >
        {Math.round(layer.width)} × {Math.round(layer.height)} mm
        {layer.rotation ? ` · ${Math.round(layer.rotation)}°` : ""}
      </span>
    </div>
  );
}

export default SelectionFrame;
