import { useEffect } from "react";
import AddressForm from "./AddressForm";
import AddressList from "./AddressList";
import Button from "./ui/Button";
import { useAddressManager } from "../hooks/useAddressManager";

/**
 * Thin orchestrator that wires the useAddressManager hook to the presentational
 * AddressList + AddressForm components and reports address state upstream.
 *
 * The header intentionally stacks (flex-col) regardless of viewport width —
 * this card always lives in a narrow sidebar column, so a viewport-based
 * media query never fires there; that was the root cause of the old
 * "Add new address" button overflowing its container.
 */
function AddressManager({ user, isAuthenticated, onAddressChange, onOrderMessage }) {
  const manager = useAddressManager({ user, isAuthenticated, onMessage: onOrderMessage });

  useEffect(() => {
    onAddressChange({
      selectedAddress: manager.selectedAddress,
      effectiveAddress: manager.effectiveAddress,
      hasErrors: manager.hasErrors,
      openForm: manager.openNewForm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager.effectiveAddress, manager.hasErrors, manager.selectedAddress, onAddressChange]);

  if (manager.mode === "guest") {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Delivery details</p>
        <h3 className="mt-1 font-display text-lg text-ink-900">Where should we deliver your order?</h3>
        <p className="mt-1 text-sm text-ink-500">
          Log in to save this address and reuse it on your next order.
        </p>

        <div className="mt-4">
          <AddressForm
            formState={manager.formState}
            errors={manager.errors}
            touched={manager.touched}
            editingAddressId=""
            requireEmail={manager.requireEmail}
            showTypeAndDefault={false}
            isSaving={false}
            onFieldChange={manager.changeField}
            onFieldBlur={manager.blurField}
            onSetFieldsSilently={manager.setFieldsSilently}
            onSubmit={manager.saveForm}
            onCancel={null}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Delivery details</p>
          <h3 className="mt-1 font-display text-lg text-ink-900">Save multiple addresses and reuse them during checkout.</h3>
          <p className="mt-1 text-sm text-ink-500">
            Signed in as {user?.email || user?.mobile}. New addresses start with your saved contact info.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={manager.openNewForm}>
          Add new address
        </Button>
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
          requireEmail={manager.requireEmail}
          showTypeAndDefault
          isSaving={manager.isSaving}
          onFieldChange={manager.changeField}
          onFieldBlur={manager.blurField}
          onSetFieldsSilently={manager.setFieldsSilently}
          onSubmit={manager.saveForm}
          onCancel={manager.resetForm}
        />
      ) : null}
    </div>
  );
}

export default AddressManager;
