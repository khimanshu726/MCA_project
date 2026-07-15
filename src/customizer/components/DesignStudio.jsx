import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Redo2, Save, ShoppingBag, Undo2 } from "lucide-react";
import EditorStage from "./EditorStage.jsx";
import SelectionToolbar from "./SelectionToolbar.jsx";
import UploadDropzone from "./UploadDropzone.jsx";
import TextPanel from "./TextPanel.jsx";
import ImagePanel from "./ImagePanel.jsx";
import BackgroundPanel from "./BackgroundPanel.jsx";
import LayersPanel from "./LayersPanel.jsx";
import OptionsPanel from "./OptionsPanel.jsx";
import ZoomControls from "./ZoomControls.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import Toast from "../../components/ui/Toast.jsx";
import { useEditorStore } from "../state/useEditorStore.js";
import { useAutosave, clearDraft } from "../hooks/useAutosave.js";
import { createImageLayer } from "../state/editorReducer.js";
import { exportDesign } from "../engine/exportDesign.js";
import { validateDesignForPrint } from "../engine/validation.js";
import { storePendingDesign } from "../pendingDesign.js";
import { uploadDesignAssetRemote } from "../../api/designsApi.js";
import { useDesigns } from "../../hooks/useDesigns.js";
import { useCart } from "../../hooks/useCart.js";
import { useToast } from "../../hooks/useToast.js";

const PANEL_TABS = [
  { id: "add", label: "Add" },
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "layers", label: "Layers" },
  { id: "options", label: "Options" },
];

const optionsSummaryText = (design, template, product) => {
  const parts = template.options
    .filter((option) => design.options[option.id])
    .map((option) => `${option.label}: ${design.options[option.id]}`);
  return parts.length > 0 ? `Customized ${product.name} — ${parts.join(", ")}` : `Customized ${product.name}`;
};

/**
 * The personalization studio: composes the editor stage, contextual
 * toolbar, and side panels around the shared editor store. Owns the
 * cross-cutting flows — asset upload, autosave/recovery, save-to-account,
 * print validation, and the flatten-and-add-to-cart handoff.
 */
function DesignStudio({ product, template, initialDesign = null, initialDesignId = null, recoveredDraft = false }) {
  const navigate = useNavigate();
  const { toast, pushToast, dismiss } = useToast();
  const { addToCart } = useCart();
  const { isAuthenticated, token, saveDesign, updateDesign, isSaving, isUpdating } = useDesigns();

  const store = useEditorStore({
    template,
    productId: product.id,
    productName: product.name,
    initialDesign,
  });
  const { design, ui, activeSide, selectedLayer, canUndo, canRedo, isDirty, actions, nudgeSelected } = store;

  const [activeTab, setActiveTab] = useState("add");
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [serverDesignId, setServerDesignId] = useState(initialDesignId);
  const [showDraftNotice, setShowDraftNotice] = useState(recoveredDraft);
  const replaceInputRef = useRef(null);

  useAutosave({ productId: product.id, design, isDirty });

  // Selecting a layer surfaces its most useful panel.
  useEffect(() => {
    if (selectedLayer?.type === "text") {
      setActiveTab("text");
    } else if (selectedLayer?.type === "image" && activeTab === "add") {
      setActiveTab("image");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayer?.id]);

  const handleImagesReady = async (images) => {
    setIsAddingImage(true);
    try {
      for (const image of images) {
        const layer = createImageLayer({
          src: image.src,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          template,
          name: image.file.name.replace(/\.[^/.]+$/, "").slice(0, 40) || "Image",
        });
        actions.addLayer(layer);

        // Object URLs die with the tab; persist the asset server-side for
        // logged-in customers so saved designs reopen with their images.
        if (isAuthenticated && token) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const uploaded = await uploadDesignAssetRemote(token, image.file);
            if (uploaded?.url) {
              actions.updateLayer(layer.id, { assetUrl: uploaded.url, src: uploaded.url }, { transient: true });
            }
          } catch {
            pushToast({ type: "error", message: "Image added locally — uploading it to your account failed." });
          }
        }
      }
    } finally {
      setIsAddingImage(false);
    }
  };

  const handleReplaceImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedLayer || selectedLayer.type !== "image") {
      return;
    }

    const src = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      actions.updateLayer(selectedLayer.id, {
        src,
        assetUrl: null,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        crop: { x: 0, y: 0, width: 1, height: 1 },
      });

      if (isAuthenticated && token) {
        uploadDesignAssetRemote(token, file)
          .then((uploaded) => {
            if (uploaded?.url) {
              actions.updateLayer(selectedLayer.id, { assetUrl: uploaded.url, src: uploaded.url }, { transient: true });
            }
          })
          .catch(() => {});
      }
    };
    image.src = src;
  };

  const persistDesign = async ({ silent = false } = {}) => {
    if (!isAuthenticated) {
      if (!silent) {
        pushToast({ type: "error", message: "Log in to save designs to your account." });
      }
      return null;
    }

    try {
      const { previewDataUrl } = await exportDesign(design, template);
      const payload = {
        productId: product.id,
        productName: product.name,
        templateId: template.id,
        name: `${product.name} design`,
        state: design,
        previewImage: previewDataUrl,
      };

      let saved;
      if (serverDesignId) {
        saved = await updateDesign({ designId: serverDesignId, ...payload, name: undefined });
      } else {
        saved = await saveDesign(payload);
        setServerDesignId(saved.id);
      }

      actions.markSaved();
      clearDraft(product.id);
      if (!silent) {
        pushToast({ type: "success", message: "Design saved to My Designs." });
      }
      return saved;
    } catch (error) {
      if (!silent) {
        pushToast({ type: "error", message: error.message || "Couldn't save the design." });
      }
      return null;
    }
  };

  const runAddToCart = async () => {
    setValidationResult(null);
    setIsExporting(true);

    try {
      const { printFiles } = await exportDesign(design, template);
      const stored = storePendingDesign({
        productId: product.id,
        productName: product.name,
        printFiles,
        optionsSummary: optionsSummaryText(design, template, product),
      });

      if (!stored) {
        pushToast({
          type: "error",
          message: "The print file is too large to hand to checkout — reduce the design size and try again.",
        });
        return;
      }

      await persistDesign({ silent: true });
      await addToCart(product, product.minimumOrderQty || 1);
      // Mark clean BEFORE clearing the draft: useAutosave flushes dirty
      // state on unmount, which would otherwise re-persist the draft the
      // moment we navigate to the cart.
      actions.markSaved();
      clearDraft(product.id);
      pushToast({ type: "success", message: `${product.name} with your design is in the cart.` });
      setTimeout(() => navigate("/cart"), 650);
    } catch (error) {
      pushToast({ type: "error", message: error.message || "Couldn't prepare the print file." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddToCart = () => {
    const result = validateDesignForPrint(design, template);
    if (result.errors.length > 0 || result.warnings.length > 0) {
      setValidationResult(result);
      return;
    }
    runAddToCart();
  };

  const sideTabs = template.sides;
  const isPersisting = isSaving || isUpdating;

  return (
    <div className="flex flex-col gap-3">
      <Toast toast={toast} onDismiss={dismiss} />

      {showDraftNotice && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold-500/40 bg-bone-100 px-4 py-2.5 text-sm text-ink-700">
          <span>Recovered your unsaved work on this product.</span>
          <button
            type="button"
            onClick={() => {
              clearDraft(product.id);
              window.location.reload();
            }}
            className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
          >
            Start fresh instead
          </button>
        </div>
      )}

      {/* Studio header: sides, history, zoom, save, add to cart */}
      <div className="flex flex-wrap items-center gap-2">
        {sideTabs.length > 1 && (
          <div role="tablist" aria-label="Product sides" className="flex rounded-full border border-ink-200 bg-white p-0.5">
            {sideTabs.map((side) => (
              <button
                key={side.id}
                type="button"
                role="tab"
                aria-selected={ui.activeSideId === side.id}
                onClick={() => actions.setActiveSide(side.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  ui.activeSideId === side.id ? "bg-brand-500 text-white" : "text-ink-600 hover:text-brand-600"
                }`}
              >
                {side.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 rounded-full border border-ink-200 bg-white px-1.5 py-1">
          <button
            type="button"
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={actions.undo}
            className="flex size-7 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 disabled:opacity-30"
          >
            <Undo2 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Redo (Ctrl+Y)"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            onClick={actions.redo}
            className="flex size-7 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 disabled:opacity-30"
          >
            <Redo2 size={14} aria-hidden="true" />
          </button>
        </div>

        <ZoomControls zoom={ui.zoom} onZoomChange={actions.setZoom} />

        <span className="text-xs text-ink-400">{isDirty ? "Unsaved changes" : "All changes saved"}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => persistDesign()}
            disabled={isPersisting}
            className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-50"
          >
            {isPersisting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Save size={13} aria-hidden="true" />}
            Save design
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isExporting}
            className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isExporting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <ShoppingBag size={13} aria-hidden="true" />}
            {isExporting ? "Preparing print file…" : "Add to cart"}
          </button>
        </div>
      </div>

      {selectedLayer && (
        <SelectionToolbar
          layer={selectedLayer}
          template={template}
          actions={actions}
          onReplaceImage={selectedLayer.type === "image" ? () => replaceInputRef.current?.click() : null}
        />
      )}
      <input ref={replaceInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Replace image" onChange={handleReplaceImage} />

      {/* Stage + panels */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[46vh] min-h-72 overflow-hidden rounded-2xl border border-ink-100 lg:h-[62vh]">
          <EditorStage
            template={template}
            side={activeSide}
            ui={ui}
            selectedLayer={selectedLayer}
            actions={actions}
            nudgeSelected={nudgeSelected}
            canUndoNow={canUndo}
            canRedoNow={canRedo}
          />
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-ink-100 bg-bone p-3">
          <div role="tablist" aria-label="Editor panels" className="mb-3 flex gap-1 overflow-x-auto">
            {PANEL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            {activeTab === "add" && (
              <div className="flex flex-col gap-3">
                <UploadDropzone onImagesReady={handleImagesReady} isBusy={isAddingImage} />
                <BackgroundPanel background={activeSide.background} actions={actions} />
              </div>
            )}
            {activeTab === "text" && <TextPanel template={template} selectedLayer={selectedLayer} actions={actions} />}
            {activeTab === "image" && <ImagePanel selectedLayer={selectedLayer} actions={actions} />}
            {activeTab === "layers" && (
              <LayersPanel layers={activeSide.layers} selectedLayerId={ui.selectedLayerId} actions={actions} />
            )}
            {activeTab === "options" && <OptionsPanel template={template} options={design.options} actions={actions} />}
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-400">
        Trim size {template.trim.width} × {template.trim.height} mm · bleed {template.bleed} mm · keep text inside the
        dashed safe area · double-click text to edit, double-click an image to crop.
      </p>

      {/* Print-readiness dialog */}
      <Dialog
        open={Boolean(validationResult)}
        onClose={() => setValidationResult(null)}
        title={validationResult?.errors.length ? "The design isn't ready to print" : "Check your design before continuing"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setValidationResult(null)}
              className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 transition hover:border-ink-400"
            >
              Keep editing
            </button>
            {validationResult && validationResult.errors.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setValidationResult(null);
                  runAddToCart();
                }}
                className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
              >
                Add to cart anyway
              </button>
            )}
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {[...(validationResult?.errors || []), ...(validationResult?.warnings || [])].map((message) => (
            <li key={message} className="flex items-start gap-2 text-sm text-ink-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold-500" aria-hidden="true" />
              {message}
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

export default DesignStudio;
