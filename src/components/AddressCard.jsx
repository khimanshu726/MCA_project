function AddressCard({ address, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <article className={`address-card ${isSelected ? "selected" : ""}`}>
      <label className="address-card-main">
        <input
          type="radio"
          name="saved-address"
          checked={isSelected}
          onChange={() => onSelect(address.id)}
        />
        <div className="address-card-copy">
          <div className="address-card-head">
            <strong>{address.fullName}</strong>
            {address.isDefault ? <span className="meta-pill address-pill">Default</span> : null}
          </div>
          <p>{address.phoneNumber}</p>
          <p>{address.address}</p>
          {address.landmark ? <p>Landmark: {address.landmark}</p> : null}
          <p>
            {address.city} - {address.postalCode}
          </p>
        </div>
      </label>

      <div className="address-card-actions">
        <button type="button" className="text-button" onClick={() => onEdit(address)}>
          Edit
        </button>
        <button type="button" className="text-button danger-button" onClick={() => onDelete(address.id)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export default AddressCard;
