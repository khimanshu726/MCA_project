import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import StudioShell from "./studio/StudioShell.jsx";
import StudioAppBar from "./studio/StudioAppBar.jsx";
import StudioCanvas from "./studio/StudioCanvas.jsx";
import StudioStatusBar from "./studio/StudioStatusBar.jsx";
import StudioInspector from "./studio/StudioInspector.jsx";
import StudioSheet from "./studio/StudioSheet.jsx";
import { RAIL_ITEMS, StudioPanel, StudioRail } from "./studio/StudioSidebar.jsx";
import PreviewDialog from "./studio/PreviewDialog.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import Toast from "../../components/ui/Toast.jsx";
import { useEditorStore } from "../state/useEditorStore.js";
import { useAutosave, clearDraft } from "../hooks/useAutosave.js";
import { useRecentUploads } from "../hooks/useRecentUploads.js";
import { createImageLayer, nextLayerId } from "../state/editorReducer.js";
import { exportDesign } from "../engine/exportDesign.js";
import { validateDesignForPrint } from "../engine/validation.js";
import { storePendingDesign } from "../pendingDesign.js";
import { readImageFiles, ACCEPTED_TYPES } from "./UploadDropzone.jsx";
import { uploadDesignAssetRemote } from "../../api/designsApi.js";
import { useDesigns } from "../../hooks/useDesigns.js";
import { useCart } from "../../hooks/useCart.js";
import { useToast } from "../../hooks/useToast.js";

const optionsSummaryText = (design, template, product) => {
  const parts = template.options
    .filter((option) => design.options[option.id])
    .map((option) => `${option.label}: ${design.options[option.id]}`);
  return parts.length > 0 ? `Customized ${product.name} — ${parts.join(", ")}` : `Customized ${product.name}`;
};

/**
 * Studio container: owns the editor store and every cross-cutting flow
 * (upload, autosave, save, preview, print validation, add-to-cart).
 * Layout is delegated entirely to StudioShell — this file holds no
 * positioning.
 */
function DesignStudio({
  product,
  template,
  productSelector = null,
  initialDesign = null,
  initialDesignId = null,
  initialDesignName = null,
  recoveredDraft = false,
}) {
  const navigate = useNavigate();
  const { toast, pushToast, dismiss } = useToast();
  const { addToCart, updateQuantity, items } = useCart();
  const { isAuthenticated, token, saveDesign, updateDesign, isSaving, isUpdating } = useDesigns();

  const store = useEditorStore({ template, productId: product.id, productName: product.name, initialDesign });
  const { design, ui, activeSide, selectedLayer, canUndo, canRedo, isDirty, actions, nudgeSelected } = store;

  const { uploads, rememberUpload, attachAssetUrl } = useRecentUploads({ isAuthenticated });

  const [projectName, setProjectName] = useState(initialDesignName || `${product.name} design`);
  const [activePanel, setActivePanel] = useState("uploads");
  const [quantity, setQuantity] = useState(product.minimumOrderQty || 1);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [serverDesignId, setServerDesignId] = useState(initialDesignId);
  const [showDraftNotice, setShowDraftNotice] = useState(recoveredDraft);
  const replaceInputRef = useRef(null);

  useAutosave({ productId: product.id, design, isDirty });

  // Print validation walks every layer on every side doing real geometry, so
  // it must not run synchronously per pointermove. Deferring lets drags stay
  // at full frame rate and the status pill settle a beat later.
  const deferredDesign = useDeferredValue(design);
  const validation = useMemo(
    () => validateDesignForPrint(deferredDesign, template),
    [deferredDesign, template],
  );

  const addImageLayers = useCallback(
    async (images) => {
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

          const uploadId = nextLayerId();
          rememberUpload({
            id: uploadId,
            name: layer.name,
            src: image.src,
            assetUrl: null,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          });

          // Object URLs die with the tab, so logged-in customers get the
          // asset persisted and both the layer and the recent-uploads entry
          // re-pointed at the durable URL.
          if (isAuthenticated && token) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const uploaded = await uploadDesignAssetRemote(token, image.file);
              if (uploaded?.url) {
                actions.updateLayer(layer.id, { assetUrl: uploaded.url, src: uploaded.url }, { transient: true });
                attachAssetUrl(uploadId, uploaded.url);
              }
            } catch {
              pushToast({ type: "error", message: "Image added locally — uploading it to your account failed." });
            }
          }
        }
      } finally {
        setIsAddingImage(false);
      }
    },
    [actions, template, isAuthenticated, token, pushToast, rememberUpload, attachAssetUrl],
  );

  // Paste lives here, not in UploadDropzone: that component only mounts
  // while the Uploads panel is open, so a listener inside it meant paste
  // silently died on every other panel.
  useEffect(() => {
    const onPaste = async (event) => {
      const target = event.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const files = [...(event.clipboardData?.items || [])]
        .filter((item) => item.kind === "file" && ACCEPTED_TYPES.includes(item.type))
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      const { images, error } = await readImageFiles(files);
      if (error) {
        pushToast({ type: "error", message: error });
      }
      if (images.length > 0) {
        addImageLayers(images);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImageLayers, pushToast]);

  const handleReuseUpload = useCallback(
    (upload) => {
      actions.addLayer(
        createImageLayer({
          src: upload.src,
          assetUrl: upload.assetUrl,
          naturalWidth: upload.naturalWidth,
          naturalHeight: upload.naturalHeight,
          template,
          name: upload.name,
        }),
      );
    },
    [actions, template],
  );

  const handleReplaceImage = useCallback(
    (event) => {
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
    },
    [actions, selectedLayer, isAuthenticated, token],
  );

  const persistDesign = useCallback(
    async ({ silent = false } = {}) => {
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
          name: projectName,
          state: design,
          previewImage: previewDataUrl,
        };

        const saved = serverDesignId
          ? await updateDesign({ designId: serverDesignId, ...payload })
          : await saveDesign(payload);

        if (!serverDesignId) {
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
    },
    [isAuthenticated, design, template, product, projectName, serverDesignId, updateDesign, saveDesign, actions, pushToast],
  );

  const runAddToCart = useCallback(async () => {
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

      // Set, don't stack: the studio quantity IS the print run, so re-adding
      // a design must land on 250 rather than silently doubling it. addItem
      // merges server-side, hence the explicit set when the line exists.
      const alreadyInCart = items.some((item) => item.productId === product.id && !item.savedForLater);
      if (alreadyInCart) {
        await updateQuantity(product.id, quantity);
      } else {
        await addToCart(product, quantity);
      }

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
  }, [design, template, product, quantity, items, updateQuantity, addToCart, persistDesign, actions, pushToast, navigate]);

  const handleAddToCart = useCallback(() => {
    const result = validateDesignForPrint(design, template);
    if (result.errors.length > 0 || result.warnings.length > 0) {
      setValidationResult(result);
      return;
    }
    runAddToCart();
  }, [design, template, runAddToCart]);

  const handleBack = useCallback(() => {
    if (isDirty && !window.confirm("Leave the studio? Your unsaved changes are kept as a draft.")) {
      return;
    }
    navigate(`/products/${product.id}`);
  }, [isDirty, navigate, product.id]);

  const handleSave = useCallback(() => persistDesign(), [persistDesign]);
  const handlePreviewOpen = useCallback(() => setIsPreviewOpen(true), []);
  const handlePreviewClose = useCallback(() => setIsPreviewOpen(false), []);
  const handleToggleGrid = useCallback(() => setShowGrid((value) => !value), []);
  const handleToggleGuides = useCallback(() => setShowGuides((value) => !value), []);
  const handleToggleRulers = useCallback(() => setShowRulers((value) => !value), []);
  const handleClosePanel = useCallback(() => setActivePanel(null), []);
  const handleTriggerReplace = useCallback(() => replaceInputRef.current?.click(), []);

  const sheetTitle = selectedLayer
    ? "Properties"
    : RAIL_ITEMS.find((item) => item.id === activePanel)?.label || "";

  return (
    <>
      <StudioShell
        appBar={
          <StudioAppBar
            projectName={projectName}
            onProjectNameChange={setProjectName}
            onBack={handleBack}
            sides={template.sides}
            activeSideId={ui.activeSideId}
            onSideChange={actions.setActiveSide}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={actions.undo}
            onRedo={actions.redo}
            isDirty={isDirty}
            isPersisting={isSaving || isUpdating}
            isExporting={isExporting}
            onPreview={handlePreviewOpen}
            onSave={handleSave}
            onAddToCart={handleAddToCart}
          />
        }
        rail={<StudioRail activePanel={activePanel} onPanelChange={setActivePanel} />}
        panel={
          <StudioPanel
            activePanel={activePanel}
            onClose={handleClosePanel}
            template={template}
            productName={product.name}
            actions={actions}
            background={activeSide.background}
            layers={activeSide.layers}
            selectedLayerId={ui.selectedLayerId}
            onImagesReady={addImageLayers}
            isAddingImage={isAddingImage}
            recentUploads={uploads}
            onReuseUpload={handleReuseUpload}
          />
        }
        canvas={
          <StudioCanvas
            template={template}
            side={activeSide}
            ui={ui}
            selectedLayer={selectedLayer}
            actions={actions}
            nudgeSelected={nudgeSelected}
            canUndo={canUndo}
            canRedo={canRedo}
            showGrid={showGrid}
            onToggleGrid={handleToggleGrid}
            showGuides={showGuides}
            onToggleGuides={handleToggleGuides}
            showRulers={showRulers}
            onToggleRulers={handleToggleRulers}
          />
        }
        inspector={
          <StudioInspector
            product={product}
            template={template}
            design={design}
            selectedLayer={selectedLayer}
            actions={actions}
            onReplaceImage={handleTriggerReplace}
            quantity={quantity}
            onQuantityChange={setQuantity}
            productSelector={productSelector}
          />
        }
        statusBar={
          <StudioStatusBar template={template} validation={validation} layerCount={activeSide.layers.length} />
        }
        sheet={
          <StudioSheet
            open={Boolean(selectedLayer || activePanel)}
            title={sheetTitle}
            onClose={selectedLayer ? () => actions.selectLayer(null) : handleClosePanel}
          >
            {selectedLayer ? (
              <StudioInspector
                bare
                product={product}
                template={template}
                design={design}
                selectedLayer={selectedLayer}
                actions={actions}
                onReplaceImage={handleTriggerReplace}
                quantity={quantity}
                onQuantityChange={setQuantity}
                productSelector={productSelector}
              />
            ) : (
              <StudioPanel
                bare
                activePanel={activePanel}
                template={template}
                productName={product.name}
                actions={actions}
                background={activeSide.background}
                layers={activeSide.layers}
                selectedLayerId={ui.selectedLayerId}
                onImagesReady={addImageLayers}
                isAddingImage={isAddingImage}
                recentUploads={uploads}
                onReuseUpload={handleReuseUpload}
              />
            )}
          </StudioSheet>
        }
      />

      <Toast toast={toast} onDismiss={dismiss} placement="top-center" />

      {showDraftNotice && (
        <div className="fixed left-1/2 top-16 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-white px-4 py-2 text-sm text-ink-700 shadow-overlay">
          <span>Recovered your unsaved work.</span>
          <button
            type="button"
            onClick={() => {
              clearDraft(product.id);
              window.location.reload();
            }}
            className="text-xs font-semibold text-brand-600 hover:underline"
          >
            Start fresh
          </button>
          <button
            type="button"
            onClick={() => setShowDraftNotice(false)}
            className="text-xs font-semibold text-ink-500 hover:underline"
          >
            Keep
          </button>
        </div>
      )}

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="Replace image"
        onChange={handleReplaceImage}
      />

      <PreviewDialog open={isPreviewOpen} onClose={handlePreviewClose} design={design} template={template} />

      <Dialog
        open={Boolean(validationResult)}
        onClose={() => setValidationResult(null)}
        size="md"
        title={validationResult?.errors.length ? "This design isn't ready to print" : "Check your design before continuing"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setValidationResult(null)}
              className="rounded-xl border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-400"
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
                className="rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Add to cart anyway
              </button>
            )}
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {[...(validationResult?.errors || []), ...(validationResult?.warnings || [])].map((message) => (
            <li key={message} className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-gold-500" aria-hidden="true" />
              {message}
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}

export default DesignStudio;
