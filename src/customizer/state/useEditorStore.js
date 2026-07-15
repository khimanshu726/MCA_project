import { useCallback, useMemo, useReducer } from "react";
import {
  canRedo,
  canUndo,
  createInitialState,
  editorReducer,
  getActiveSide,
  getSelectedLayer,
} from "./editorReducer.js";

/**
 * Thin hook over the editor reducer: memoised action creators plus derived
 * selections, so stage/panel components stay presentational.
 */
export function useEditorStore({ template, productId, productName, initialDesign = null }) {
  const [state, dispatch] = useReducer(
    editorReducer,
    { template, productId, productName, design: initialDesign },
    (init) =>
      createInitialState({
        template,
        productId: init.productId,
        productName: init.productName,
        design: init.design,
      }),
  );

  const actions = useMemo(
    () => ({
      hydrate: (design) => dispatch({ type: "HYDRATE", design, template }),
      addLayer: (layer, sideId) => dispatch({ type: "ADD_LAYER", layer, sideId }),
      addLayers: (layers, sideId) => dispatch({ type: "ADD_LAYERS", layers, sideId }),
      updateLayer: (layerId, patch, options = {}) =>
        dispatch({ type: "UPDATE_LAYER", layerId, patch, transient: options.transient, sideId: options.sideId }),
      removeLayer: (layerId) => dispatch({ type: "REMOVE_LAYER", layerId }),
      duplicateLayer: (layerId) => dispatch({ type: "DUPLICATE_LAYER", layerId }),
      reorderLayer: (layerId, direction, index) => dispatch({ type: "REORDER_LAYER", layerId, direction, index }),
      setBackground: (background, sideId) => dispatch({ type: "SET_BACKGROUND", background, sideId }),
      setOption: (optionId, value) => dispatch({ type: "SET_OPTION", optionId, value }),
      beginTransaction: () => dispatch({ type: "BEGIN_TRANSACTION" }),
      endTransaction: () => dispatch({ type: "END_TRANSACTION" }),
      cancelTransaction: () => dispatch({ type: "CANCEL_TRANSACTION" }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      selectLayer: (layerId) => dispatch({ type: "SELECT_LAYER", layerId }),
      setActiveSide: (sideId) => dispatch({ type: "SET_ACTIVE_SIDE", sideId }),
      setZoom: (zoom) => dispatch({ type: "SET_ZOOM", zoom }),
      setCropMode: (layerId) => dispatch({ type: "SET_CROP_MODE", layerId }),
      markSaved: () => dispatch({ type: "MARK_SAVED" }),
    }),
    [template],
  );

  const nudgeSelected = useCallback(
    (dx, dy) => {
      const layer = getSelectedLayer(state);
      if (!layer || layer.locked) {
        return;
      }
      actions.updateLayer(layer.id, { x: layer.x + dx, y: layer.y + dy });
    },
    [state, actions],
  );

  return {
    state,
    design: state.design,
    ui: state.ui,
    activeSide: getActiveSide(state),
    selectedLayer: getSelectedLayer(state),
    canUndo: canUndo(state),
    canRedo: canRedo(state),
    isDirty: state.dirty,
    actions,
    nudgeSelected,
  };
}
