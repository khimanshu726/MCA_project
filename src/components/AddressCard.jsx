import Badge from "./ui/Badge";

const TYPE_LABELS = { home: "Home", office: "Office", other: "Other" };

function AddressCard({ address, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <article
      className={`rounded-2xl border p-4 transition ${isSelected ? "border-brand-400 ring-1 ring-brand-400/30 bg-brand-50/40" : "border-ink-100 bg-white"}`}
    >
      <label className="flex items-start gap-3">
        <input
          type="radio"
          name="saved-address"
          className="mt-1 size-4 border-ink-300 text-brand-500 focus:ring-brand-500"
          checked={isSelected}
          onChange={() => onSelect(address._id)}
        />
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
      </label>

      <div className="mt-3 flex items-center gap-4 pl-7 text-sm">
        <button type="button" className="font-medium text-ink-600 hover:text-brand-600" onClick={() => onEdit(address)}>
          Edit
        </button>
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
