export const sanitizeName = (value) => value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");
export const sanitizeDigits = (value, maxLength) => value.replace(/\D/g, "").slice(0, maxLength);

export const validateField = (name, value, { requireEmail = false } = {}) => {
  const trimmed = typeof value === "string" ? value.trim() : "";

  switch (name) {
    case "fullName":
      if (!trimmed) return "Full name is required.";
      if (!/^[A-Za-z\s]+$/.test(trimmed)) return "Use only alphabets and spaces.";
      return "";
    case "phoneNumber":
      if (!trimmed) return "Phone number is required.";
      if (!/^\d{10}$/.test(trimmed)) return "Phone number must be exactly 10 digits.";
      return "";
    case "email":
      if (!requireEmail) return "";
      if (!trimmed) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
      return "";
    case "pincode":
      if (!trimmed) return "Pincode is required.";
      if (!/^\d{6}$/.test(trimmed)) return "Pincode must be exactly 6 digits.";
      return "";
    case "addressLine1":
      if (!trimmed) return "Address line 1 is required.";
      return "";
    case "city":
      if (!trimmed) return "City is required.";
      return "";
    case "state":
      if (!trimmed) return "State is required.";
      return "";
    case "addressLine2":
    case "landmark":
    case "district":
    case "addressType":
    case "isDefault":
      return "";
    default:
      return "";
  }
};

export const validateAddressForm = (formState, options = {}) =>
  Object.keys(formState).reduce((accumulator, key) => {
    accumulator[key] = validateField(key, formState[key], options);
    return accumulator;
  }, {});

export const hasAddressErrors = (errors) => Object.values(errors).some(Boolean);
