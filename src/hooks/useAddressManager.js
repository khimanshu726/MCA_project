import { useEffect, useMemo, useState } from "react";
import { useAddresses } from "./useAddresses";
import { useAddressFormState } from "./useAddressFormState";
import { createPrefilledAddressForm } from "../utils/addressForm";
import { hasAddressErrors, validateAddressForm } from "../utils/addressValidation";

/**
 * Auth-aware address facade, mirroring useCart's guest/authenticated split:
 * authenticated customers get a real saved-address book backed by the
 * server (CRUD, default selection); guests get today's single-use form with
 * no persistence — saving an address for reuse requires login, same gate as
 * wishlist/save-for-later.
 */
export function useAddressManager({ user, isAuthenticated, onMessage }) {
  const server = useAddresses();

  // ---- Authenticated: saved list + create/edit form ----
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const authForm = useAddressFormState({ requireEmail: false });

  useEffect(() => {
    if (!isAuthenticated) return;
    const stillExists = server.addresses.some((address) => address._id === selectedAddressId);
    if (stillExists) return;
    const preferred = server.addresses.find((address) => address.isDefault) || server.addresses[0];
    setSelectedAddressId(preferred ? preferred._id : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, server.addresses]);

  const openNewForm = () => {
    onMessage("");
    setEditingAddressId("");
    authForm.setForm({ ...authForm.formState, ...createPrefilledAddressForm(user), email: "" });
    setIsFormVisible(true);
  };

  const openEditForm = (address) => {
    onMessage("");
    setEditingAddressId(address._id);
    authForm.setForm({
      fullName: address.fullName,
      phoneNumber: address.phoneNumber,
      email: "",
      pincode: address.pincode,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      landmark: address.landmark || "",
      city: address.city,
      district: address.district || "",
      state: address.state,
      addressType: address.addressType || "home",
      isDefault: address.isDefault,
    });
    setIsFormVisible(true);
  };

  const resetForm = () => {
    setIsFormVisible(false);
    setEditingAddressId("");
  };

  const saveForm = async (event) => {
    event.preventDefault();
    if (!authForm.validateAll()) {
      onMessage("Please correct the highlighted address fields before saving.");
      return;
    }

    const { email: _email, ...payload } = authForm.formState;

    try {
      if (editingAddressId) {
        await server.updateAddress(editingAddressId, payload);
      } else {
        const created = await server.createAddress(payload);
        setSelectedAddressId(created.address._id);
      }
      onMessage("Address saved successfully.");
      resetForm();
    } catch (error) {
      onMessage(error.payload?.message || error.message || "Unable to save this address.");
    }
  };

  const deleteAddress = async (addressId) => {
    await server.deleteAddress(addressId);
    if (editingAddressId === addressId) resetForm();
  };

  const selectedAuthAddress = useMemo(
    () => server.addresses.find((address) => address._id === selectedAddressId) || null,
    [server.addresses, selectedAddressId],
  );

  // ---- Guest: single ephemeral form, no saved list ----
  const guestForm = useAddressFormState({ requireEmail: true });

  useEffect(() => {
    if (isAuthenticated) return;
    guestForm.setForm(createPrefilledAddressForm(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const guestErrors = useMemo(
    () => validateAddressForm(guestForm.formState, { requireEmail: true }),
    [guestForm.formState],
  );
  const guestHasErrors = hasAddressErrors(guestErrors);

  if (isAuthenticated) {
    return {
      mode: "authenticated",
      isLoading: server.isLoading,
      isSaving: server.isSaving,
      savedAddresses: server.addresses,
      selectedAddressId,
      setSelectedAddressId,
      selectedAddress: selectedAuthAddress,
      effectiveAddress: selectedAuthAddress,
      hasErrors: !selectedAuthAddress,
      isFormVisible,
      editingAddressId,
      formState: authForm.formState,
      errors: authForm.errors,
      touched: authForm.touched,
      requireEmail: false,
      changeField: authForm.changeField,
      blurField: authForm.blurField,
      setFieldsSilently: authForm.setFieldsSilently,
      openNewForm,
      openEditForm,
      resetForm,
      saveForm,
      deleteAddress,
      setDefaultAddress: server.setDefaultAddress,
    };
  }

  return {
    mode: "guest",
    isLoading: false,
    isSaving: false,
    savedAddresses: [],
    selectedAddressId: "",
    setSelectedAddressId: () => undefined,
    selectedAddress: null,
    effectiveAddress: guestHasErrors ? null : guestForm.formState,
    hasErrors: guestHasErrors,
    isFormVisible: true,
    editingAddressId: "",
    formState: guestForm.formState,
    errors: guestForm.errors,
    touched: guestForm.touched,
    requireEmail: true,
    changeField: guestForm.changeField,
    blurField: guestForm.blurField,
    setFieldsSilently: guestForm.setFieldsSilently,
    openNewForm: () => undefined,
    openEditForm: () => undefined,
    resetForm: () => undefined,
    saveForm: (event) => event.preventDefault(),
    deleteAddress: () => undefined,
    setDefaultAddress: () => undefined,
  };
}
