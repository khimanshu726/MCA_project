import { useEffect, useMemo, useState, useCallback } from "react";
import {
  hasAddressErrors,
  sanitizeDigits,
  sanitizeName,
  validateAddressForm,
  validateField,
} from "../utils/addressValidation";
import {
  createPrefilledAddressForm,
  emptyAddressForm,
  loadSavedAddresses,
  loadSelectedAddressId,
  persistSavedAddresses,
  persistSelectedAddressId,
} from "../utils/addressStorage";

const buildEffectiveAddress = (selectedAddress, formState, isFormVisible) => {
  if (!selectedAddress && isFormVisible) {
    return formState;
  }
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
 * Encapsulates saved-address state, form state, validation, and persistence.
 * Returns everything the AddressManager UI needs.
 */
export function useAddressManager({ user, onOrderMessage }) {
  const [savedAddresses, setSavedAddresses] = useState(loadSavedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(() =>
    loadSelectedAddressId(loadSavedAddresses()),
  );
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [formState, setFormState] = useState(emptyAddressForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const selectedAddress = useMemo(
    () => savedAddresses.find((address) => address.id === selectedAddressId) ?? null,
    [savedAddresses, selectedAddressId],
  );

  const effectiveAddress = useMemo(
    () => buildEffectiveAddress(selectedAddress, formState, isFormVisible),
    [selectedAddress, formState, isFormVisible],
  );

  const selectedAddressErrors = useMemo(
    () => computeAddressErrors(effectiveAddress),
    [effectiveAddress],
  );

  const hasErrors = useMemo(
    () => hasAddressErrors(selectedAddressErrors),
    [selectedAddressErrors],
  );

  // Persist saved addresses whenever they change
  useEffect(() => {
    persistSavedAddresses(savedAddresses);
  }, [savedAddresses]);

  // Keep selectedAddressId in sync with the saved list
  useEffect(() => {
    if (selectedAddressId && savedAddresses.some((a) => a.id === selectedAddressId)) {
      persistSelectedAddressId(selectedAddressId);
      return;
    }

    if (savedAddresses.length === 0) {
      persistSelectedAddressId("");
      if (selectedAddressId !== "") {
        setSelectedAddressId("");
      }
      return;
    }

    const fallbackId = savedAddresses[0].id;
    if (selectedAddressId !== fallbackId) {
      setSelectedAddressId(fallbackId);
    }
    persistSelectedAddressId(fallbackId);
  }, [savedAddresses, selectedAddressId]);

  const resetForm = useCallback(() => {
    setIsFormVisible(false);
    setEditingAddressId("");
    setFormState(createPrefilledAddressForm(user));
    setErrors({});
    setTouched({});
  }, [user]);

  const openNewForm = useCallback(() => {
    onOrderMessage("");
    setIsFormVisible(true);
    setEditingAddressId("");
    setFormState(createPrefilledAddressForm(user));
    setErrors({});
    setTouched({});
  }, [onOrderMessage, user]);

  const openEditForm = useCallback(
    (address) => {
      onOrderMessage("");
      setIsFormVisible(true);
      setEditingAddressId(address.id);
      setFormState({
        fullName: address.fullName,
        phoneNumber: address.phoneNumber,
        email: address.email,
        address: address.address,
        landmark: address.landmark ?? "",
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
      });
      setErrors({});
      setTouched({});
    },
    [onOrderMessage],
  );

  const deleteAddress = useCallback(
    (addressId) => {
      setSavedAddresses((current) => {
        const next = current.filter((address) => address.id !== addressId);
        if (selectedAddressId === addressId) {
          setSelectedAddressId(next[0]?.id ?? "");
        }
        return next.map((address, index) => ({
          ...address,
          isDefault: index === 0,
        }));
      });

      if (editingAddressId === addressId) {
        resetForm();
      }
    },
    [editingAddressId, resetForm, selectedAddressId],
  );

  const sanitizeFieldValue = (field, rawValue) => {
    if (field === "fullName") return sanitizeName(rawValue);
    if (field === "phoneNumber") return sanitizeDigits(rawValue, 10);
    if (field === "postalCode") return sanitizeDigits(rawValue, 6);
    return rawValue;
  };

  const changeField = useCallback(
    (field, rawValue) => {
      const nextValue = sanitizeFieldValue(field, rawValue);
      setFormState((current) => ({ ...current, [field]: nextValue }));
      onOrderMessage("");

      setTouched((current) => {
        if (!current[field]) return current;
        setErrors((currentErrors) => ({
          ...currentErrors,
          [field]: validateField(field, nextValue),
        }));
        return current;
      });
    },
    [onOrderMessage],
  );

  const blurField = useCallback((field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({
      ...current,
      [field]: validateField(field, formStateRef.current[field]),
    }));
  }, []);

  // Keep a ref to the latest formState so blurField doesn't need to depend on it
  const formStateRef = useRefState(formState);

  const setCityValue = useCallback(
    (city) => {
      setFormState((current) => ({ ...current, city }));
      setTouched((current) => ({ ...current, city: true }));
      setErrors((current) => ({ ...current, city: "" }));
    },
    [],
  );

  const saveForm = useCallback(
    (event) => {
      event.preventDefault();

      const nextErrors = validateAddressForm(formState);
      const nextTouched = Object.keys(formState).reduce((accumulator, key) => {
        accumulator[key] = true;
        return accumulator;
      }, {});

      setErrors(nextErrors);
      setTouched(nextTouched);

      if (hasAddressErrors(nextErrors)) {
        onOrderMessage("Please correct the highlighted address fields before saving.");
        return;
      }

      const preparedAddress = {
        id: editingAddressId || `addr-${Date.now()}`,
        ...formState,
        fullName: formState.fullName.trim(),
        email: formState.email.trim(),
        address: formState.address.trim(),
        landmark: formState.landmark.trim(),
        city: formState.city.trim(),
        state: formState.state.trim(),
        isDefault: savedAddresses.length === 0 || !selectedAddressId,
      };

      setSavedAddresses((current) => {
        if (editingAddressId) {
          return current.map((address) =>
            address.id === editingAddressId
              ? { ...address, ...preparedAddress, isDefault: address.isDefault }
              : address,
          );
        }
        return [
          ...current.map((address) => ({ ...address, isDefault: false })),
          preparedAddress,
        ];
      });

      setSelectedAddressId(preparedAddress.id);
      onOrderMessage("Address saved successfully.");
      resetForm();
    },
    [editingAddressId, formState, onOrderMessage, resetForm, savedAddresses.length, selectedAddressId],
  );

  return {
    savedAddresses,
    selectedAddress,
    selectedAddressId,
    setSelectedAddressId,
    effectiveAddress,
    selectedAddressErrors,
    hasErrors,
    isFormVisible,
    editingAddressId,
    formState,
    errors,
    touched,
    openNewForm,
    openEditForm,
    resetForm,
    deleteAddress,
    changeField,
    blurField,
    setCityValue,
    saveForm,
  };
}

/**
 * Tiny helper: mirrors state into a ref so callbacks can read the latest value
 * without needing it as a dependency.
 */
function useRefState(value) {
  const ref = useMemo(() => ({ current: value }), []);
  ref.current = value;
  return ref;
}
