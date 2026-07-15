import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Palette, Pencil, Trash2 } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import Toast from "../components/ui/Toast";
import { useDesigns } from "../hooks/useDesigns";
import { useToast } from "../hooks/useToast";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "";

/**
 * "My Designs": every saved customization, reopenable in the studio.
 * Continue editing routes to /customize/:productId?design=<id> — the studio
 * hydrates from the server state instead of starting fresh.
 */
function MyDesignsPage() {
  const navigate = useNavigate();
  const { toast, pushToast, dismiss } = useToast();
  const { designs, isLoading, duplicateDesign, deleteDesign, updateDesign } = useDesigns();

  const [pendingDelete, setPendingDelete] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  const commitRename = async (design) => {
    const trimmed = draftName.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === design.name) {
      return;
    }
    try {
      await updateDesign({ designId: design.id, name: trimmed });
      pushToast({ type: "success", message: "Design renamed." });
    } catch (error) {
      pushToast({ type: "error", message: error.message || "Couldn't rename the design." });
    }
  };

  const handleDuplicate = async (design) => {
    try {
      await duplicateDesign(design.id);
      pushToast({ type: "success", message: `"${design.name}" duplicated.` });
    } catch (error) {
      pushToast({ type: "error", message: error.message || "Couldn't duplicate the design." });
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteDesign(target.id);
      pushToast({ type: "success", message: `"${target.name}" deleted.` });
    } catch (error) {
      pushToast({ type: "error", message: error.message || "Couldn't delete the design." });
    }
  };

  return (
    <main className="page-stack">
      <Toast toast={toast} onDismiss={dismiss} />

      <section className="section-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">My designs</p>
            <h2>Saved customizations, ready to reorder or keep editing.</h2>
          </div>
        </div>

        {isLoading ? (
          <p className="section-copy">Loading your designs&hellip;</p>
        ) : designs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-100 bg-white px-6 py-12 text-center">
            <Palette size={28} className="text-brand-500" aria-hidden="true" />
            <p className="text-sm font-medium text-ink-900">No saved designs yet</p>
            <p className="max-w-sm text-sm text-ink-500">
              Customize any product and save the design — it will appear here for quick reordering and edits.
            </p>
            <Link
              to="/customize"
              className="mt-1 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Start customizing
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((design) => (
              <li key={design.id} className="flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white">
                <button
                  type="button"
                  onClick={() => navigate(`/customize/${design.productId}?design=${design.id}`)}
                  className="block aspect-[4/3] w-full overflow-hidden bg-bone-100"
                  aria-label={`Continue editing ${design.name}`}
                >
                  {design.previewImage ? (
                    <img src={design.previewImage} alt="" className="size-full object-contain" loading="lazy" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-ink-300">
                      <Palette size={28} aria-hidden="true" />
                    </span>
                  )}
                </button>

                <div className="flex flex-1 flex-col gap-2 p-4">
                  {renamingId === design.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      aria-label="Rename design"
                      onChange={(event) => setDraftName(event.target.value)}
                      onBlur={() => commitRename(design)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename(design);
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                      className="rounded-lg border border-brand-300 px-2 py-1 text-sm text-ink-900 focus:outline-none"
                    />
                  ) : (
                    <p className="truncate text-sm font-semibold text-ink-900">{design.name}</p>
                  )}
                  <p className="text-xs text-ink-500">
                    {design.productName || design.productId} · Updated {formatDate(design.updatedAt)}
                  </p>

                  <div className="mt-auto flex items-center gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/customize/${design.productId}?design=${design.id}`)}
                      className="rounded-full bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600"
                    >
                      Continue editing
                    </button>
                    <button
                      type="button"
                      title="Rename"
                      aria-label={`Rename ${design.name}`}
                      onClick={() => {
                        setRenamingId(design.id);
                        setDraftName(design.name);
                      }}
                      className="flex size-7 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
                    >
                      <Pencil size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate"
                      aria-label={`Duplicate ${design.name}`}
                      onClick={() => handleDuplicate(design)}
                      className="flex size-7 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition hover:border-brand-300 hover:text-brand-600"
                    >
                      <Copy size={13} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      aria-label={`Delete ${design.name}`}
                      onClick={() => setPendingDelete(design)}
                      className="flex size-7 items-center justify-center rounded-full border border-ink-200 text-ink-500 transition hover:border-danger-500 hover:text-danger-600"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete this design?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="rounded-full border border-ink-200 px-4 py-2 text-xs font-semibold text-ink-700 transition hover:border-ink-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              className="rounded-full bg-danger-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-danger-600"
            >
              Delete design
            </button>
          </>
        }
      >
        {pendingDelete ? `"${pendingDelete.name}" will be permanently removed.` : ""}
      </Dialog>
    </main>
  );
}

export default MyDesignsPage;
