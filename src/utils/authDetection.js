const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeMobileInput = (value) => value.replace(/\D/g, "").slice(0, 10);

export const detectLoginType = (value = "") => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "unknown";
  }

  if (trimmedValue.includes("@") && emailPattern.test(trimmedValue.toLowerCase())) {
    return "email";
  }

  if (/^\d{10}$/.test(normalizeMobileInput(trimmedValue)) && normalizeMobileInput(trimmedValue) === trimmedValue) {
    return "mobile";
  }

  return "unknown";
};
