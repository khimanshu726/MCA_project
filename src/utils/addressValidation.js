export const sanitizeName = (value) => value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");
export const sanitizeDigits = (value, maxLength) => value.replace(/\D/g, "").slice(0, maxLength);

export const validateField = (name, value) => {
  const trimmed = value.trim();

  switch (name) {
    case "fullName":
      if (!trimmed) {
        return "Full name is required.";
      }
      if (!/^[A-Za-z\s]+$/.test(trimmed)) {
        return "Use only alphabets and spaces.";
      }
      return "";
    case "phoneNumber":
      if (!trimmed) {
        return "Phone number is required.";
      }
      if (!/^\d{10}$/.test(trimmed)) {
        return "Phone number must be exactly 10 digits.";
      }
      return "";
    case "address":
      if (!trimmed) {
        return "Address is required.";
      }
      return "";
    case "landmark":
      return "";
    case "city":
      if (!trimmed) {
        return "City is required.";
      }
      return "";
    case "postalCode":
      if (!trimmed) {
        return "Postal code is required.";
      }
      if (!/^\d{6}$/.test(trimmed)) {
        return "Postal code must be exactly 6 digits.";
      }
      return "";
    default:
      return "";
  }
};

export const validateAddressForm = (formState) =>
  Object.keys(formState).reduce((accumulator, key) => {
    accumulator[key] = validateField(key, formState[key]);
    return accumulator;
  }, {});

export const hasAddressErrors = (errors) => Object.values(errors).some(Boolean);
