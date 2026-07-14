import { Trash2 } from "lucide-react";

function SelectAllBar({ allSelected, someSelected, onToggleAll, selectedCount, onBulkRemove, totalCount }) {
  if (totalCount === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-sm">
      <label className="flex items-center gap-2 font-medium text-ink-700">
        <input
          type="checkbox"
          className="size-4 rounded border-ink-300 text-brand-500 focus:ring-brand-500"
          checked={allSelected}
          ref={(node) => {
            if (node) node.indeterminate = someSelected && !allSelected;
          }}
          onChange={onToggleAll}
        />
        Select all ({totalCount})
      </label>
      {selectedCount > 0 ? (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 font-semibold text-danger-600 hover:text-danger-700"
          onClick={onBulkRemove}
        >
          <Trash2 size={14} /> Remove selected ({selectedCount})
        </button>
      ) : null}
    </div>
  );
}

export default SelectAllBar;
