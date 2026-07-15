import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  getCanvasSize,
  getDefaultOptions,
  getSafeRect,
  getTemplateById,
  getTemplateForProduct,
  getTrimRect,
} from "../customizer/templates.js";
import {
  effectiveDpi,
  initialImagePlacement,
  qualityLevel,
  resizeLayer,
  rotatePoint,
  rotationFromPointer,
  snapCenter,
  snapRotation,
} from "../customizer/engine/geometry.js";
import {
  canRedo,
  canUndo,
  createImageLayer,
  createInitialState,
  createTextLayer,
  editorReducer,
  getActiveSide,
  getSelectedLayer,
} from "../customizer/state/editorReducer.js";
import { validateDesignForPrint } from "../customizer/engine/validation.js";
import { createInitialDesign } from "../customizer/state/editorReducer.js";

const cardTemplate = TEMPLATES["visiting-cards"];

describe("template registry", () => {
  it("resolves a template from a product category with a fallback", () => {
    expect(getTemplateForProduct({ id: "x", category: "Visiting Cards" }).id).toBe("visiting-cards");
    expect(getTemplateForProduct({ id: "x", category: "Banners" }).id).toBe("banners");
    expect(getTemplateForProduct({ id: "x", category: "Unknown Category" }).id).toBe("custom-print");
    expect(getTemplateForProduct(null).id).toBe("custom-print");
    expect(getTemplateById("nope").id).toBe("custom-print");
  });

  it("every template has coherent print geometry", () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.trim.width).toBeGreaterThan(0);
      expect(template.trim.height).toBeGreaterThan(0);
      expect(template.bleed).toBeGreaterThanOrEqual(0);
      expect(template.safe).toBeGreaterThanOrEqual(0);
      expect(template.minDpi).toBeGreaterThan(0);
      expect(template.sides.length).toBeGreaterThan(0);

      const canvas = getCanvasSize(template);
      const trim = getTrimRect(template);
      const safe = getSafeRect(template);

      expect(canvas.width).toBe(template.trim.width + template.bleed * 2);
      expect(trim.x).toBe(template.bleed);
      expect(safe.width).toBeLessThanOrEqual(trim.width);
      expect(safe.width).toBeGreaterThan(0);
    }
  });

  it("defaults every option to its first value", () => {
    const options = getDefaultOptions(cardTemplate);
    expect(options.paper).toBe("350 GSM Matte");
    expect(options.corners).toBe("Square");
  });
});

describe("geometry", () => {
  it("computes effective DPI from natural pixels, printed size, and crop", () => {
    const layer = {
      type: "image",
      naturalWidth: 1050,
      naturalHeight: 600,
      width: 88.9, // 3.5 inches
      height: 50.8, // 2 inches
      crop: { x: 0, y: 0, width: 1, height: 1 },
    };

    expect(effectiveDpi(layer)).toBe(300);

    // Cropping to half the pixels halves the DPI.
    const cropped = { ...layer, crop: { x: 0, y: 0, width: 0.5, height: 0.5 } };
    expect(effectiveDpi(cropped)).toBe(150);
  });

  it("grades quality against the template's DPI floors", () => {
    expect(qualityLevel(320, cardTemplate)).toBe("good");
    expect(qualityLevel(100, cardTemplate)).toBe("poor");
    expect(qualityLevel(null, cardTemplate)).toBe("unknown");
  });

  it("rotates points around a center", () => {
    const rotated = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(rotated.x).toBeCloseTo(0, 5);
    expect(rotated.y).toBeCloseTo(10, 5);
  });

  it("resizes from the south-east handle keeping the anchor fixed", () => {
    const layer = { x: 50, y: 50, width: 40, height: 20, rotation: 0, aspectLocked: true };
    // Anchor (nw corner) is at (30, 40); drag se corner to (90, 80).
    // Aspect (2:1) is kept on corner drags; the dominant drag axis (Y here,
    // 2x growth vs 1.5x) wins, so the box "covers" the pointer.
    const resized = resizeLayer(layer, "se", { x: 90, y: 80 });

    expect(resized.width).toBeCloseTo(80, 3);
    expect(resized.height).toBeCloseTo(40, 3);
    expect(resized.x - resized.width / 2).toBeCloseTo(30, 3);
    expect(resized.y - resized.height / 2).toBeCloseTo(40, 3);

    // Unlocked layers resize freely on corner drags.
    const free = resizeLayer({ ...layer, aspectLocked: false }, "se", { x: 90, y: 80 });
    expect(free.width).toBeCloseTo(60, 3);
    expect(free.height).toBeCloseTo(40, 3);
  });

  it("resizes edges without disturbing the perpendicular axis", () => {
    const layer = { x: 50, y: 50, width: 40, height: 20, rotation: 0, aspectLocked: false };
    const resized = resizeLayer(layer, "e", { x: 100, y: 50 });

    expect(resized.width).toBeCloseTo(70, 3);
    expect(resized.height).toBeCloseTo(20, 3);
    expect(resized.y).toBeCloseTo(50, 3);
  });

  it("enforces a minimum layer size", () => {
    const layer = { x: 50, y: 50, width: 40, height: 20, rotation: 0, aspectLocked: false };
    const resized = resizeLayer(layer, "se", { x: 30.5, y: 40.5 });

    expect(resized.width).toBeGreaterThanOrEqual(2);
    expect(resized.height).toBeGreaterThanOrEqual(2);
  });

  it("derives rotation from the pointer and snaps near cardinal angles", () => {
    const layer = { x: 50, y: 50 };
    // Pointer directly above the center = 0deg.
    expect(rotationFromPointer(layer, { x: 50, y: 10 })).toBeCloseTo(0, 3);
    // Pointer to the right = 90deg.
    expect(rotationFromPointer(layer, { x: 90, y: 50 })).toBeCloseTo(90, 3);

    expect(snapRotation(2)).toBe(0);
    expect(snapRotation(88)).toBe(90);
    expect(snapRotation(67)).toBe(67);
  });

  it("snaps the layer center to canvas center and reports guides", () => {
    const layer = { width: 20, height: 10 };
    const canvas = getCanvasSize(cardTemplate);

    const snapped = snapCenter(layer, { x: canvas.width / 2 + 0.8, y: 30 }, cardTemplate, 1.5);
    expect(snapped.x).toBe(canvas.width / 2);
    expect(snapped.guides).toContain("center-v");

    const unsnapped = snapCenter(layer, { x: canvas.width / 2 + 10, y: 30 }, cardTemplate, 1.5);
    expect(unsnapped.x).toBe(canvas.width / 2 + 10);
  });

  it("places new images inside the trim area preserving aspect", () => {
    const placement = initialImagePlacement(2000, 1000, cardTemplate);
    expect(placement.width / placement.height).toBeCloseTo(2, 3);
    expect(placement.width).toBeLessThanOrEqual(cardTemplate.trim.width * 0.7 + 0.001);
  });
});

describe("editor reducer", () => {
  const setup = () => {
    const state = createInitialState({
      template: cardTemplate,
      productId: "classic-card",
      productName: "Classic Visiting Card",
    });
    const layer = createImageLayer({
      src: "blob:test",
      naturalWidth: 1200,
      naturalHeight: 800,
      template: cardTemplate,
      name: "Logo",
    });
    return { state: editorReducer(state, { type: "ADD_LAYER", layer }), layer };
  };

  it("initialises one side per template side with a white background", () => {
    const state = createInitialState({ template: cardTemplate, productId: "p1" });
    expect(Object.keys(state.design.sides)).toEqual(["front", "back"]);
    expect(state.design.sides.front.background).toEqual({ type: "color", value: "#ffffff" });
    expect(state.ui.activeSideId).toBe("front");
  });

  it("adds a layer, selects it, and records history", () => {
    const { state, layer } = setup();
    expect(getActiveSide(state).layers).toHaveLength(1);
    expect(state.ui.selectedLayerId).toBe(layer.id);
    expect(canUndo(state)).toBe(true);
  });

  it("undo/redo walk the design history", () => {
    const { state, layer } = setup();

    const moved = editorReducer(state, {
      type: "UPDATE_LAYER",
      layerId: layer.id,
      patch: { x: 10 },
    });
    expect(getSelectedLayer(moved).x).toBe(10);

    const undone = editorReducer(moved, { type: "UNDO" });
    expect(getActiveSide(undone).layers[0].x).toBe(layer.x);
    expect(canRedo(undone)).toBe(true);

    const redone = editorReducer(undone, { type: "REDO" });
    expect(getActiveSide(redone).layers[0].x).toBe(10);
  });

  it("collapses a drag transaction into a single undo step", () => {
    const { state, layer } = setup();

    let next = editorReducer(state, { type: "BEGIN_TRANSACTION" });
    next = editorReducer(next, { type: "UPDATE_LAYER", layerId: layer.id, patch: { x: 11 }, transient: true });
    next = editorReducer(next, { type: "UPDATE_LAYER", layerId: layer.id, patch: { x: 12 }, transient: true });
    next = editorReducer(next, { type: "UPDATE_LAYER", layerId: layer.id, patch: { x: 13 }, transient: true });
    next = editorReducer(next, { type: "END_TRANSACTION" });

    expect(getSelectedLayer(next).x).toBe(13);
    expect(next.past.length).toBe(state.past.length + 1);

    const undone = editorReducer(next, { type: "UNDO" });
    expect(getSelectedLayer(undone).x).toBe(layer.x);
  });

  it("duplicates a layer with an offset and new id", () => {
    const { state, layer } = setup();
    const next = editorReducer(state, { type: "DUPLICATE_LAYER", layerId: layer.id });

    const layers = getActiveSide(next).layers;
    expect(layers).toHaveLength(2);
    expect(layers[1].id).not.toBe(layer.id);
    expect(layers[1].x).toBe(layer.x + 4);
    expect(next.ui.selectedLayerId).toBe(layers[1].id);
  });

  it("reorders layers forward/backward/front/back", () => {
    const { state } = setup();
    const text = createTextLayer({ template: cardTemplate });
    let next = editorReducer(state, { type: "ADD_LAYER", layer: text });

    const [first] = getActiveSide(next).layers;
    next = editorReducer(next, { type: "REORDER_LAYER", layerId: first.id, direction: "front" });
    expect(getActiveSide(next).layers[1].id).toBe(first.id);

    next = editorReducer(next, { type: "REORDER_LAYER", layerId: first.id, direction: "back" });
    expect(getActiveSide(next).layers[0].id).toBe(first.id);
  });

  it("removes a layer and clears its selection", () => {
    const { state, layer } = setup();
    const next = editorReducer(state, { type: "REMOVE_LAYER", layerId: layer.id });

    expect(getActiveSide(next).layers).toHaveLength(0);
    expect(next.ui.selectedLayerId).toBeNull();
  });

  it("switching sides clears selection and rejects unknown sides", () => {
    const { state } = setup();

    const swapped = editorReducer(state, { type: "SET_ACTIVE_SIDE", sideId: "back" });
    expect(swapped.ui.activeSideId).toBe("back");
    expect(swapped.ui.selectedLayerId).toBeNull();

    const unknown = editorReducer(state, { type: "SET_ACTIVE_SIDE", sideId: "inside" });
    expect(unknown).toBe(state);
  });

  it("validates print readiness: empty designs error, low DPI and cut-off layers warn", () => {
    const empty = createInitialDesign({ template: cardTemplate, productId: "p1" });
    const emptyResult = validateDesignForPrint(empty, cardTemplate);
    expect(emptyResult.errors).toHaveLength(1);
    expect(emptyResult.errors[0]).toMatch(/empty/i);

    const design = createInitialDesign({ template: cardTemplate, productId: "p1" });
    const goodImage = createImageLayer({
      src: "blob:x",
      naturalWidth: 4000,
      naturalHeight: 3000,
      template: cardTemplate,
    });
    design.sides.front.layers.push(goodImage);
    expect(validateDesignForPrint(design, cardTemplate).warnings).toHaveLength(0);

    // Tiny source image stretched large = poor DPI warning.
    const blurry = { ...goodImage, id: "blurry", name: "Blurry", naturalWidth: 100, naturalHeight: 80 };
    design.sides.front.layers.push(blurry);
    const blurryResult = validateDesignForPrint(design, cardTemplate);
    expect(blurryResult.warnings.some((warning) => warning.includes("DPI"))).toBe(true);

    // A layer parked far outside the canvas gets a cut-off warning.
    const outside = { ...goodImage, id: "outside", name: "Outside", x: -200, y: -200 };
    design.sides.front.layers.push(outside);
    const outsideResult = validateDesignForPrint(design, cardTemplate);
    expect(outsideResult.warnings.some((warning) => warning.includes("cut off"))).toBe(true);
  });

  it("clamps zoom and records option changes in history", () => {
    const { state } = setup();

    expect(editorReducer(state, { type: "SET_ZOOM", zoom: 99 }).ui.zoom).toBe(4);
    expect(editorReducer(state, { type: "SET_ZOOM", zoom: 0 }).ui.zoom).toBe(0.1);

    const withOption = editorReducer(state, { type: "SET_OPTION", optionId: "paper", value: "Textured Ivory" });
    expect(withOption.design.options.paper).toBe("Textured Ivory");
    const undone = editorReducer(withOption, { type: "UNDO" });
    expect(undone.design.options.paper).toBe("350 GSM Matte");
  });
});
