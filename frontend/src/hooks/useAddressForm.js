import { useCallback, useMemo, useRef, useState } from "react";
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
} from "../utils/addressStorage";

const sanitizeFieldValue = (field, rawValue) => {
  if (field === "fullName") return sanitizeName(rawValue);
  if (field === "phoneNumber") return sanitizeDigits(rawValue, 10);
  if (field === "postalCode") return sanitizeDigits(rawValue, 6);
  return rawValue;
};

const markAllTouched = (state) =>
  Object.keys(state).reduce((accumulator, key) => {
    accumulator[key] = true;
    return accumulator;
  }, {});

/**
 * Standalone form state for the delivery address form.
 * Handles input change, blur validation, and prepared payload construction.
 */
export function useAddressForm({ user, onMessage }) {
  const [isVisible, setIsVisible] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [formState, setFormState] = useState(emptyAddressForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  const openNew = useCallback(() => {
    onMessage("");
    setIsVisible(true);
    setEditingId("");
    setFormState(createPrefilledAddressForm(user));
    setErrors({});
    setTouched({});
  }, [onMessage, user]);

  const openEdit = useCallback(
    (address) => {
      onMessage("");
      setIsVisible(true);
      setEditingId(address.id);
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
    [onMessage],
  );

  const reset = useCallback(() => {
    setIsVisible(false);
    setEditingId("");
    setFormState(createPrefilledAddressForm(user));
    setErrors({});
    setTouched({});
  }, [user]);

  const changeField = useCallback(
    (field, rawValue) => {
      const nextValue = sanitizeFieldValue(field, rawValue);
      setFormState((current) => ({ ...current, [field]: nextValue }));
      onMessage("");
      setTouched((current) => {
        if (!current[field]) return current;
        setErrors((currentErrors) => ({
          ...currentErrors,
          [field]: validateField(field, nextValue),
        }));
        return current;
      });
    },
    [onMessage],
  );

  const blurField = useCallback((field) => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({
      ...current,
      [field]: validateField(field, formStateRef.current[field]),
    }));
  }, []);

  const setCityValue = useCallback((city) => {
    setFormState((current) => ({ ...current, city }));
    setTouched((current) => ({ ...current, city: true }));
    setErrors((current) => ({ ...current, city: "" }));
  }, []);

  const preparedAddress = useMemo(
    () => ({
      ...formState,
      fullName: formState.fullName.trim(),
      email: formState.email.trim(),
      address: formState.address.trim(),
      landmark: formState.landmark.trim(),
      city: formState.city.trim(),
      state: formState.state.trim(),
    }),
    [formState],
  );

  const submit = useCallback(
    (event, onValid) => {
      event.preventDefault();
      const nextErrors = validateAddressForm(formState);
      setErrors(nextErrors);
      setTouched(markAllTouched(formState));

      if (hasAddressErrors(nextErrors)) {
        onMessage("Please correct the highlighted address fields before saving.");
        return false;
      }

      const finalId = editingId || `addr-${Date.now()}`;
      onValid({ ...preparedAddress, id: finalId }, editingId);
      onMessage("Address saved successfully.");
      reset();
      return true;
    },
    [editingId, formState, onMessage, preparedAddress, reset],
  );

  return {
    isVisible,
    editingId,
    formState,
    errors,
    touched,
    openNew,
    openEdit,
    reset,
    changeField,
    blurField,
    setCityValue,
    submit,
  };
}
