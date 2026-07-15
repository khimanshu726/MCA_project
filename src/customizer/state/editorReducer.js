import { getCanvasSize, getDefaultOptions } from "../templates.js";
import { initialImagePlacement } from "../engine/geometry.js";

/**
 * Editor store: one reducer holding the undoable design document plus
 * non-undoable UI state (selection, zoom, active side, crop mode).
 *
 * History model: any non-transient design mutation pushes the previous
 * design onto `past`. Drags dispatch transient updates (no history churn
 * per pointermove) inside a BEGIN/END transaction — END pushes the single
 * pre-drag snapshot, so one drag = one undo step.
 */

export const MAX_HISTORY = 100;
export const STATE_VERSION = 1;

let uidCounter = 0;
export const nextLayerId = () => `layer-${Date.now().toString(36)}-${(uidCounter += 1)}`;

export const DEFAULT_FILTERS = { brightness: 100, contrast: 100, saturation: 100 };
export const FULL_CROP = { x: 0, y: 0, width: 1, height: 1 };

export function createImageLayer({ src, assetUrl = null, naturalWidth, naturalHeight, template, name }) {
  const placement = initialImagePlacement(naturalWidth, naturalHeight, template);

  return {
    id: nextLayerId(),
    type: "image",
    name: name || "Image",
    src,
    assetUrl,
    naturalWidth,
    naturalHeight,
    ...placement,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    flipH: false,
    flipV: false,
    aspectLocked: true,
    crop: { ...FULL_CROP },
    filters: { ...DEFAULT_FILTERS },
  };
}

export function createShapeLayer({ template, kind = "rect", name }) {
  const canvas = getCanvasSize(template);
  const base = Math.min(template.trim.width, template.trim.height) * 0.35;

  return {
    id: nextLayerId(),
    type: "shape",
    kind, // rect | ellipse | line | triangle
    name: name || "Shape",
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: kind === "line" ? base * 2 : base,
    height: kind === "line" ? Math.max(base * 0.06, 1.5) : base,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    fill: "#b8461d",
    stroke: "#17181b",
    strokeWidth: 0,
    cornerRadius: 0,
    aspectLocked: false,
  };
}

export function createIconLayer({ template, pathData, viewBox = 24, name }) {
  const canvas = getCanvasSize(template);
  const size = Math.min(template.trim.width, template.trim.height) * 0.3;

  return {
    id: nextLayerId(),
    type: "icon",
    name: name || "Graphic",
    pathData,
    viewBox,
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: size,
    height: size,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    fill: "#17181b",
    aspectLocked: true,
  };
}

export function createTextLayer({ template, text = "Your text", name }) {
  const canvas = getCanvasSize(template);
  const width = Math.min(canvas.width * 0.6, 120);
  // Font size scales with the product: ~4.5% of the shorter trim edge so a
  // banner's default text isn't microscopic and a card's isn't gigantic.
  const fontSize = Math.max(4, Math.min(template.trim.width, template.trim.height) * 0.09);

  return {
    id: nextLayerId(),
    type: "text",
    name: name || "Text",
    text,
    x: canvas.width / 2,
    y: canvas.height / 2,
    width,
    height: fontSize * 1.4,
    rotation: 0,
    opacity: 1,
    locked: false,
    hidden: false,
    fontFamily: "Inter",
    fontSize,
    fontWeight: 400,
    italic: false,
    underline: false,
    uppercase: false,
    align: "center",
    letterSpacing: 0,
    lineHeight: 1.25,
    color: "#17181b",
    strokeColor: "#ffffff",
    strokeWidth: 0,
    shadow: null,
    aspectLocked: false,
  };
}

export function createInitialDesign({ template, productId, productName }) {
  const sides = {};
  for (const side of template.sides) {
    sides[side.id] = {
      background: { type: "color", value: "#ffffff" },
      layers: [],
    };
  }

  return {
    version: STATE_VERSION,
    templateId: template.id,
    productId,
    productName: productName || "",
    options: getDefaultOptions(template),
    sides,
  };
}

export function createInitialState({ template, productId, productName, design = null }) {
  const initialDesign = design || createInitialDesign({ template, productId, productName });
  const firstSide = template.sides[0]?.id || "front";

  return {
    design: initialDesign,
    past: [],
    future: [],
    transactionSnapshot: null,
    dirty: false,
    ui: {
      selectedLayerId: null,
      activeSideId: initialDesign.sides[firstSide] ? firstSide : Object.keys(initialDesign.sides)[0],
      zoom: 1,
      cropLayerId: null,
    },
  };
}

const pushHistory = (state, previousDesign) => ({
  past: [...state.past.slice(-(MAX_HISTORY - 1)), previousDesign],
  future: [],
});

const updateSide = (design, sideId, updater) => ({
  ...design,
  sides: {
    ...design.sides,
    [sideId]: updater(design.sides[sideId]),
  },
});

const updateLayers = (design, sideId, updater) =>
  updateSide(design, sideId, (side) => ({ ...side, layers: updater(side.layers) }));

export function editorReducer(state, action) {
  switch (action.type) {
    case "HYDRATE": {
      return {
        ...createInitialState({
          template: action.template,
          productId: action.design.productId,
          productName: action.design.productName,
          design: action.design,
        }),
        dirty: false,
      };
    }

    case "ADD_LAYER": {
      const sideId = action.sideId || state.ui.activeSideId;
      const nextDesign = updateLayers(state.design, sideId, (layers) => [...layers, action.layer]);

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
        ui: { ...state.ui, selectedLayerId: action.layer.id, cropLayerId: null },
      };
    }

    case "ADD_LAYERS": {
      // Multiple layers in one history step (design starters).
      if (!action.layers?.length) {
        return state;
      }
      const sideId = action.sideId || state.ui.activeSideId;
      const nextDesign = updateLayers(state.design, sideId, (layers) => [...layers, ...action.layers]);

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
        ui: { ...state.ui, selectedLayerId: action.layers[action.layers.length - 1].id, cropLayerId: null },
      };
    }

    case "UPDATE_LAYER": {
      const sideId = action.sideId || state.ui.activeSideId;
      const side = state.design.sides[sideId];
      if (!side || !side.layers.some((layer) => layer.id === action.layerId)) {
        return state;
      }

      const nextDesign = updateLayers(state.design, sideId, (layers) =>
        layers.map((layer) => (layer.id === action.layerId ? { ...layer, ...action.patch } : layer)),
      );

      if (action.transient) {
        return { ...state, design: nextDesign, dirty: true };
      }

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
      };
    }

    case "REMOVE_LAYER": {
      const sideId = action.sideId || state.ui.activeSideId;
      const nextDesign = updateLayers(state.design, sideId, (layers) =>
        layers.filter((layer) => layer.id !== action.layerId),
      );

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
        ui: {
          ...state.ui,
          selectedLayerId: state.ui.selectedLayerId === action.layerId ? null : state.ui.selectedLayerId,
          cropLayerId: state.ui.cropLayerId === action.layerId ? null : state.ui.cropLayerId,
        },
      };
    }

    case "DUPLICATE_LAYER": {
      const sideId = action.sideId || state.ui.activeSideId;
      const side = state.design.sides[sideId];
      const source = side?.layers.find((layer) => layer.id === action.layerId);
      if (!source) {
        return state;
      }

      const copy = {
        ...source,
        id: nextLayerId(),
        name: `${source.name} copy`,
        x: source.x + 4,
        y: source.y + 4,
        locked: false,
      };

      const nextDesign = updateLayers(state.design, sideId, (layers) => {
        const index = layers.findIndex((layer) => layer.id === action.layerId);
        const next = [...layers];
        next.splice(index + 1, 0, copy);
        return next;
      });

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
        ui: { ...state.ui, selectedLayerId: copy.id },
      };
    }

    case "REORDER_LAYER": {
      const sideId = action.sideId || state.ui.activeSideId;
      const side = state.design.sides[sideId];
      if (!side) {
        return state;
      }

      const index = side.layers.findIndex((layer) => layer.id === action.layerId);
      if (index === -1) {
        return state;
      }

      let targetIndex;
      if (action.direction === "forward") {
        targetIndex = Math.min(index + 1, side.layers.length - 1);
      } else if (action.direction === "backward") {
        targetIndex = Math.max(index - 1, 0);
      } else if (action.direction === "front") {
        targetIndex = side.layers.length - 1;
      } else if (action.direction === "back") {
        targetIndex = 0;
      } else if (typeof action.index === "number") {
        targetIndex = Math.max(0, Math.min(action.index, side.layers.length - 1));
      } else {
        return state;
      }

      if (targetIndex === index) {
        return state;
      }

      const nextDesign = updateLayers(state.design, sideId, (layers) => {
        const next = [...layers];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
      };
    }

    case "SET_BACKGROUND": {
      const sideId = action.sideId || state.ui.activeSideId;
      const nextDesign = updateSide(state.design, sideId, (side) => ({
        ...side,
        background: action.background,
      }));

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
      };
    }

    case "SET_OPTION": {
      const nextDesign = {
        ...state.design,
        options: { ...state.design.options, [action.optionId]: action.value },
      };

      return {
        ...state,
        design: nextDesign,
        ...pushHistory(state, state.design),
        dirty: true,
      };
    }

    case "BEGIN_TRANSACTION": {
      return { ...state, transactionSnapshot: state.design };
    }

    case "END_TRANSACTION": {
      if (!state.transactionSnapshot || state.transactionSnapshot === state.design) {
        return { ...state, transactionSnapshot: null };
      }

      return {
        ...state,
        ...pushHistory(state, state.transactionSnapshot),
        transactionSnapshot: null,
      };
    }

    case "CANCEL_TRANSACTION": {
      // Roll the design back to the transaction start without touching
      // history (used by "Cancel" in crop mode).
      if (!state.transactionSnapshot) {
        return state;
      }

      return { ...state, design: state.transactionSnapshot, transactionSnapshot: null };
    }

    case "UNDO": {
      if (state.past.length === 0) {
        return state;
      }

      const previous = state.past[state.past.length - 1];
      return {
        ...state,
        design: previous,
        past: state.past.slice(0, -1),
        future: [state.design, ...state.future].slice(0, MAX_HISTORY),
        dirty: true,
        ui: { ...state.ui, cropLayerId: null },
      };
    }

    case "REDO": {
      if (state.future.length === 0) {
        return state;
      }

      const [next, ...rest] = state.future;
      return {
        ...state,
        design: next,
        past: [...state.past.slice(-(MAX_HISTORY - 1)), state.design],
        future: rest,
        dirty: true,
        ui: { ...state.ui, cropLayerId: null },
      };
    }

    case "SELECT_LAYER": {
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedLayerId: action.layerId,
          cropLayerId: state.ui.cropLayerId === action.layerId ? state.ui.cropLayerId : null,
        },
      };
    }

    case "SET_ACTIVE_SIDE": {
      if (!state.design.sides[action.sideId]) {
        return state;
      }

      return {
        ...state,
        ui: { ...state.ui, activeSideId: action.sideId, selectedLayerId: null, cropLayerId: null },
      };
    }

    case "SET_ZOOM": {
      return {
        ...state,
        ui: { ...state.ui, zoom: Math.min(4, Math.max(0.1, action.zoom)) },
      };
    }

    case "SET_CROP_MODE": {
      return {
        ...state,
        ui: { ...state.ui, cropLayerId: action.layerId, selectedLayerId: action.layerId || state.ui.selectedLayerId },
      };
    }

    case "MARK_SAVED": {
      return { ...state, dirty: false };
    }

    default:
      return state;
  }
}

export const getActiveSide = (state) => state.design.sides[state.ui.activeSideId];

export const getSelectedLayer = (state) => {
  const side = getActiveSide(state);
  if (!side || !state.ui.selectedLayerId) {
    return null;
  }
  return side.layers.find((layer) => layer.id === state.ui.selectedLayerId) || null;
};

export const canUndo = (state) => state.past.length > 0;
export const canRedo = (state) => state.future.length > 0;
