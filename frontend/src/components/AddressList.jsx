import AddressCard from "./AddressCard";

function AddressList({
  addresses,
  selectedAddressId,
  onSelect,
  onEdit,
  onDelete,
}) {
  if (addresses.length === 0) {
    return (
      <div className="empty-state-card">
        <p className="section-copy">
          No saved addresses yet. Add your first delivery address below.
        </p>
      </div>
    );
  }

  return (
    <div className="saved-addresses-stack">
      {addresses.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          isSelected={address.id === selectedAddressId}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export default AddressList;
