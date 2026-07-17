import Badge from "./ui/Badge";

const TYPE_LABELS = { home: "Home", office: "Office", other: "Other" };

/**
 * One saved address, in two contexts.
 *
 * Checkout passes `onSelect` and the card becomes a radio option — "deliver
 * here". The account page doesn't: there is no order to deliver, so the radio
 * would be a control that decides nothing. It passes `onSetDefault` instead,
 * which is the only "which address matters" question that exists outside a
 * checkout.
 *
 * Both are optional and additive, so the checkout card renders exactly as before.
 */
function AddressCard({ address, isSelected, onSelect, onEdit, onDelete, onSetDefault }) {
  const isSelectable = typeof onSelect === "function";
  const Wrapper = isSelectable ? "label" : "div";

  return (
    <article
      className={`rounded-2xl border p-4 transition ${isSelected ? "border-brand-400 ring-1 ring-brand-400/30 bg-brand-50/40" : "border-ink-100 bg-white"}`}
    >
      <Wrapper className="flex items-start gap-3">
        {isSelectable ? (
          <input
            type="radio"
            name="saved-address"
            className="mt-1 size-4 border-ink-300 text-brand-500 focus:ring-brand-500"
            checked={isSelected}
            onChange={() => onSelect(address._id)}
          />
        ) : null}
        <div className="flex-1 text-sm text-ink-700">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <strong className="text-ink-900">{address.fullName}</strong>
            <Badge tone="neutral">{TYPE_LABELS[address.addressType] || "Home"}</Badge>
            {address.isDefault ? <Badge tone="brand">Default</Badge> : null}
          </div>
          <p>{address.phoneNumber}</p>
          <p>
            {address.addressLine1}
            {address.addressLine2 ? `, ${address.addressLine2}` : ""}
          </p>
          {address.landmark ? <p>Landmark: {address.landmark}</p> : null}
          <p>
            {address.city}
            {address.district && address.district !== address.city ? `, ${address.district}` : ""}, {address.state} -{" "}
            {address.pincode}
          </p>
        </div>
      </Wrapper>

      {/* pl-7 aligns the actions under the text when a radio occupies the
          gutter; without one there is no gutter to clear. */}
      <div className={`mt-3 flex flex-wrap items-center gap-4 text-sm ${isSelectable ? "pl-7" : ""}`}>
        <button type="button" className="font-medium text-ink-600 hover:text-brand-600" onClick={() => onEdit(address)}>
          Edit
        </button>
        {onSetDefault && !address.isDefault ? (
          <button
            type="button"
            className="font-medium text-ink-600 hover:text-brand-600"
            onClick={() => onSetDefault(address._id)}
          >
            Set as default
          </button>
        ) : null}
        <button
          type="button"
          className="font-medium text-danger-600 hover:text-danger-700"
          onClick={() => onDelete(address._id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default AddressCard;
