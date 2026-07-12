import { useMemo } from "react";
import {
  hasAddressErrors,
  validateAddressForm,
} from "../utils/addressValidation";
import { useAddressBook } from "./useAddressBook";
import { useAddressForm } from "./useAddressForm";

const buildEffectiveAddress = (selectedAddress, formState, isFormVisible) => {
  if (!selectedAddress && isFormVisible) return formState;
  return selectedAddress;
};

const computeAddressErrors = (address) => {
  if (!address) return {};
  return validateAddressForm({
    fullName: address.fullName || "",
    phoneNumber: address.phoneNumber || "",
    email: address.email || "",
    address: address.address || "",
    landmark: address.landmark || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || "",
  });
};

/**
 * Thin orchestrator that combines the address book (saved list + selection)
 * with the address form (create/edit state) and exposes a single API for the
 * AddressManager UI component.
 */
export function useAddressManager({ user, onOrderMessage }) {
  const book = useAddressBook();
  const form = useAddressForm({ user, onMessage: onOrderMessage });

  const effectiveAddress = useMemo(
    () => buildEffectiveAddress(book.selectedAddress, form.formState, form.isVisible),
    [book.selectedAddress, form.formState, form.isVisible],
  );

  const selectedAddressErrors = useMemo(
    () => computeAddressErrors(effectiveAddress),
    [effectiveAddress],
  );

  const hasErrors = useMemo(
    () => hasAddressErrors(selectedAddressErrors),
    [selectedAddressErrors],
  );

  const deleteAddress = (addressId) => {
    book.deleteAddress(addressId);
    if (form.editingId === addressId) {
      form.reset();
    }
  };

  const saveForm = (event) =>
    form.submit(event, (preparedAddress, editingId) => {
      const withDefault = {
        ...preparedAddress,
        isDefault: book.savedAddresses.length === 0 || !book.selectedAddressId,
      };
      book.upsertAddress(withDefault, editingId);
    });

  return {
    // list state
    savedAddresses: book.savedAddresses,
    selectedAddress: book.selectedAddress,
    selectedAddressId: book.selectedAddressId,
    setSelectedAddressId: book.setSelectedAddressId,
    // derived
    effectiveAddress,
    selectedAddressErrors,
    hasErrors,
    // form state
    isFormVisible: form.isVisible,
    editingAddressId: form.editingId,
    formState: form.formState,
    errors: form.errors,
    touched: form.touched,
    // actions
    openNewForm: form.openNew,
    openEditForm: form.openEdit,
    resetForm: form.reset,
    changeField: form.changeField,
    blurField: form.blurField,
    setCityValue: form.setCityValue,
    deleteAddress,
    saveForm,
  };
}
