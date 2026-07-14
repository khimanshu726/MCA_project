import { useCallback, useRef, useState } from "react";
import {
  hasAddressErrors,
  sanitizeDigits,
  sanitizeName,
  validateAddressForm,
  validateField,
} from "../utils/addressValidation";
import { emptyAddressForm } from "../utils/addressForm";

const sanitizeFieldValue = (field, rawValue) => {
  if (field === "fullName") return sanitizeName(rawValue);
  if (field === "phoneNumber") return sanitizeDigits(rawValue, 10);
  if (field === "pincode") return sanitizeDigits(rawValue, 6);
  return rawValue;
};

/**
 * Generic address-form field/error/touched state, shared by the guest
 * single-use form and the authenticated create/edit form. Auth-awareness
 * (persistence, saved list) lives in useAddressManager; this hook only
 * knows about one form's fields.
 */
export function useAddressFormState({ requireEmail = false } = {}) {
  const [formState, setFormState] = useState(emptyAddressForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  const setForm = useCallback((next) => {
    setFormState(next);
    setErrors({});
    setTouched({});
  }, []);

  const changeField = useCallback(
    (field, rawValue) => {
      const nextValue = sanitizeFieldValue(field, rawValue);
      setFormState((current) => ({ ...current, [field]: nextValue }));
      setTouched((current) => {
        if (!current[field]) return current;
        setErrors((currentErrors) => ({
          ...currentErrors,
          [field]: validateField(field, nextValue, { requireEmail }),
        }));
        return current;
      });
    },
    [requireEmail],
  );

  const blurField = useCallback(
    (field) => {
      setTouched((current) => ({ ...current, [field]: true }));
      setErrors((current) => ({
        ...current,
        [field]: validateField(field, formStateRef.current[field], { requireEmail }),
      }));
    },
    [requireEmail],
  );

  // Applies a patch (e.g. pincode auto-fill) without marking those fields
  // touched — the user didn't type them, so no error should flash yet.
  const setFieldsSilently = useCallback((patch) => {
    setFormState((current) => ({ ...current, ...patch }));
  }, []);

  const validateAll = useCallback(() => {
    const nextErrors = validateAddressForm(formStateRef.current, { requireEmail });
    setErrors(nextErrors);
    setTouched(
      Object.keys(formStateRef.current).reduce((accumulator, key) => {
        accumulator[key] = true;
        return accumulator;
      }, {}),
    );
    return !hasAddressErrors(nextErrors);
  }, [requireEmail]);

  return { formState, errors, touched, setForm, changeField, blurField, setFieldsSilently, validateAll };
}
