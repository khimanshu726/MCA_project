import { useEffect } from "react";
import AddressForm from "./AddressForm";
import AddressList from "./AddressList";
import { useAddressManager } from "../hooks/useAddressManager";

/**
 * Thin orchestrator that wires the useAddressManager hook to the presentational
 * AddressList + AddressForm components and reports address state upstream.
 */
function AddressManager({ user, isAuthenticated, onAddressChange, onOrderMessage }) {
  const manager = useAddressManager({ user, onOrderMessage });

  // Report the effective address & error state upstream whenever it changes.
  useEffect(() => {
    onAddressChange({
      selectedAddress: manager.selectedAddress,
      effectiveAddress: manager.effectiveAddress,
      selectedAddressErrors: manager.selectedAddressErrors,
      hasErrors: manager.hasErrors,
      openForm: manager.openNewForm,
    });
  }, [
    manager.effectiveAddress,
    manager.hasErrors,
    manager.openNewForm,
    manager.selectedAddress,
    manager.selectedAddressErrors,
    onAddressChange,
  ]);

  const handleCityChange = (city) => {
    manager.setCityValue(city);
  };

  return (
    <div className="summary-card">
      <div className="delivery-header">
        <div>
          <p className="eyebrow">Delivery details</p>
          <h3 className="section-subtitle">
            Save multiple addresses and reuse them during checkout.
          </h3>
          {isAuthenticated ? (
            <p className="field-helper">
              Signed in as {user?.email || user?.mobile}. New addresses start with your saved
              contact info.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="secondary-button compact-button address-add-button"
          onClick={manager.openNewForm}
        >
          Add new address
        </button>
      </div>

      <AddressList
        addresses={manager.savedAddresses}
        selectedAddressId={manager.selectedAddressId}
        onSelect={manager.setSelectedAddressId}
        onEdit={manager.openEditForm}
        onDelete={manager.deleteAddress}
      />

      {manager.isFormVisible ? (
        <AddressForm
          formState={manager.formState}
          errors={manager.errors}
          touched={manager.touched}
          editingAddressId={manager.editingAddressId}
          onFieldChange={manager.changeField}
          onFieldBlur={manager.blurField}
          onCityChange={handleCityChange}
          onSubmit={manager.saveForm}
          onCancel={manager.resetForm}
        />
      ) : null}
    </div>
  );
}

export default AddressManager;
