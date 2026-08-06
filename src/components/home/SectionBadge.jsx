/**
 * Numbered section marker: filled counter chip + outlined label pill.
 * Shared by every section below the hero so the numbering stays sequential
 * in one place rather than being retyped per section.
 */
function SectionBadge({ number, label, borderClassName = "border-ink-200" }) {
  return (
    <div className="mb-6 flex items-center gap-3 sm:mb-8">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-semibold text-white sm:h-7 sm:w-7 sm:text-xs">
        {number}
      </span>
      <span
        className={`rounded-full border px-3 py-1 text-xs font-medium text-ink-900 sm:px-4 sm:py-1.5 sm:text-[13px] ${borderClassName}`}
      >
        {label}
      </span>
    </div>
  );
}

export default SectionBadge;
