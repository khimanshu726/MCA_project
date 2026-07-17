import AddressCard from "./AddressCard";

function AddressList({ addresses, selectedAddressId, onSelect, onEdit, onDelete, onSetDefault, emptyMessage }) {
  if (addresses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-4 text-sm text-ink-500">
        {/* The default copy points "below", which is true in checkout where the
            form sits underneath. A caller that puts the form elsewhere says so. */}
        {emptyMessage || "No saved addresses yet. Add your first delivery address below."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {addresses.map((address) => (
        <AddressCard
          key={address._id}
          address={address}
          isSelected={address._id === selectedAddressId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
          onSetDefault={onSetDefault}
        />
      ))}
    </div>
  );
}

export default AddressList;
